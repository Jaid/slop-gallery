import type {R3fStaticRenderingOptions, ResolvedR3fStaticRenderingOptions} from './options.ts'
import type {SceneNode, StaticDiagnostic, StaticPlan} from './plan.ts'
import type {NodePath} from '@babel/traverse'

import {createHash} from 'node:crypto'

import * as t from '@babel/types'
import MagicString from 'magic-string'
import {importInfo, Recipe, SourceGraph} from 'vite-plugin-bake-core'
import {threeAdapter} from 'vite-plugin-bake-core/three'

import {optimizeScene} from './optimize.ts'
import {resolveR3fStaticRenderingOptions} from './options.ts'
import {lowerScene, sceneFromValue} from './scene.ts'

export type CompiledPlan = {
  hash: string
  plan: StaticPlan
}
export type Compilation = {
  code: string
  dependencies: ReadonlySet<string>
  diagnostics: Array<StaticDiagnostic>
  map: ReturnType<MagicString['generateMap']>
  plans: Array<CompiledPlan>
}
type Region = {
  end: number
  expression: t.Expression
  jsxChild: boolean
  nodes?: Array<SceneNode>
  path: NodePath
  start: number
}

function transparentBranch(path: NodePath<t.JSXElement>) {
  const name = path.node.openingElement.name
  if (!t.isJSXIdentifier(name)) {
    return false
  }
  const binding = path.scope.getBinding(name.name)
  const info = binding && importInfo(binding.path)
  return info?.source === 'branch-component' && info.imported === 'default'
}
function contextReason(path: NodePath) {
  let parent = path.parentPath
  while (parent) {
    if (parent.isJSXElement()) {
      const name = parent.node.openingElement.name
      if (!t.isJSXIdentifier(name) || name.name !== 'group' && !transparentBranch(parent)) {
        return 'Opaque ancestor may observe individual objects, collect colliders, or attach interaction.'
      }
      if (parent.node.openingElement.attributes.some(attribute => !t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name) || /^(dispose|layers|matrix|on|ref|renderOrder)/u.test(attribute.name.name))) {
        return 'Ancestor has imperative, interaction or ordering behavior.'
      }
    }
    if (parent.isFunction()) {
      let imperative = false
      parent.traverse({CallExpression(call) {
        const callee = call.node.callee
        if (!t.isIdentifier(callee)) {
          return
        }
        const binding = call.scope.getBinding(callee.name)
        const imported = binding && importInfo(binding.path)
        if (imported?.source.startsWith('@react-three/fiber') && ['useFrame', 'useThree'].includes(imported.imported)) {
          imperative = true
        }
      }})
      if (imperative) {
        return 'Enclosing component accesses the frame loop or imperative Three state.'
      }
    }
    parent = parent.parentPath
  }
}
function renderPosition(path: NodePath): boolean {
  const parent = path.parentPath
  if (!parent) {
    return false
  }
  if (parent.isJSXExpressionContainer()) {
    return parent.parentPath.isJSXElement() || parent.parentPath.isJSXFragment()
  }
  if (parent.isJSXElement() || parent.isJSXFragment()) {
    return true
  }
  if (parent.isConditionalExpression() && path.key !== 'test' || parent.isLogicalExpression() && path.key === 'right' || parent.isTSAsExpression() || parent.isTSNonNullExpression()) {
    return renderPosition(parent)
  }
  // A component may return an array directly, but an arbitrary map's consumers
  // (length/filter/spread/etc.) must retain the original array shape.
  if (parent.isReturnStatement() || parent.isArrowFunctionExpression() && parent.node.body === path.node) {
    const fn = parent.isFunction() ? parent : parent.findParent(ancestor => ancestor.isFunction())
    if (fn?.isFunctionDeclaration()) {
      return /^[A-Z]/u.test(fn.node.id?.name ?? '') || fn.parentPath.isExportDefaultDeclaration()
    }
    if (fn?.isArrowFunctionExpression() || fn?.isFunctionExpression()) {
      const declaration = fn.parentPath
      return declaration.isVariableDeclarator() && t.isIdentifier(declaration.node.id) && /^[A-Z]/u.test(declaration.node.id.name)
    }
  }
  return false
}
const hasJsx = (path: NodePath) => {
  let found = false
  path.traverse({
    JSXElement() {
      found = true
    },
    JSXFragment() {
      found = true
    },
  })
  return found
}

/** Pure compiler entry point, also used by Vite and executable transform tests. */
export async function compileStaticRendering(code: string, id: string, options: R3fStaticRenderingOptions = {}, graph = new SourceGraph(async () => {})): Promise<Compilation> {
  const resolved: ResolvedR3fStaticRenderingOptions = resolveR3fStaticRenderingOptions(options)
  const source = await graph.input(id, code)
  const output = new MagicString(code)
  const plans = new Map<string, CompiledPlan>
  const imports = new Map<string, string>
  const diagnostics: Array<StaticDiagnostic> = []
  const dependencies = new Set<string>
  const regions: Array<Region> = []
  const siblingRuns: Array<Array<{
    expression: t.Expression
    path: NodePath
  }>> = []
  const adapter = threeAdapter({
    name: 'static-render-data',
    kind: 'geometry',
  })
  const evaluate = async (path: NodePath, expression: t.Expression) => {
    const reason = contextReason(path)
    if (reason) {
      throw new Error(reason)
    }
    const evaluated = await new Recipe(graph, adapter).evaluateValue(path, options.timeoutMs ?? 1000, lowerScene(expression))
    for (const dependency of evaluated.dependencies) {
      dependencies.add(dependency)
    }
    return sceneFromValue(evaluated.value, options.maxNodes ?? 10_000)
  }
  const push = (path: NodePath, expression: t.Expression) => regions.push({
    path,
    expression,
    start: path.node.start!,
    end: path.node.end!,
    jsxChild: path.parentPath?.isJSXElement() || path.parentPath?.isJSXFragment(),
  })
  source.path.traverse({
    JSXElement(path) {
      if (t.isJSXIdentifier(path.node.openingElement.name, {name: 'group'})) {
        push(path, path.node)
      }
    },
    JSXFragment(path) {
      push(path, path.node)
    },
    CallExpression(path) {
      if (t.isMemberExpression(path.node.callee) && !path.node.callee.computed && t.isIdentifier(path.node.callee.property) && ['flatMap', 'map'].includes(path.node.callee.property.name) && hasJsx(path) && renderPosition(path)) {
        push(path, path.node)
      }
    },
  })
  // Also discover contiguous static sibling runs inside an otherwise dynamic scene.
  source.path.traverse({
    'JSXElement|JSXFragment'(parent) {
      if (!parent.isJSXElement() && !parent.isJSXFragment()) {
        return
      }
      let run: Array<{
        expression: t.Expression
        path: NodePath
      }> = []
      const flush = () => {
        if (run.length > 1) {
          siblingRuns.push(run)
        }
        run = []
      }
      for (const child of parent.get('children')) {
        if (child.isJSXText() && child.node.value.trim() === '') {
          continue
        }
        const expression = child.isJSXExpressionContainer() && t.isExpression(child.node.expression) ? child.node.expression : (child.isJSXElement() || child.isJSXFragment() ? child.node : undefined)
        if (!expression) {
          flush(); continue
        }
        try {
          lowerScene(expression); run.push({
            path: child,
            expression,
          })
        } catch {
          flush()
        }
      }
      flush()
    },
  })
  for (const run of siblingRuns) {
    let parts: Array<{
      expression: t.Expression
      nodes: Array<SceneNode>
      path: NodePath
    }> = []
    const flush = () => {
      if (parts.length > 1) {
        regions.push({
          path: parts[0].path,
          expression: t.arrayExpression(parts.map(item => item.expression)),
          start: parts[0].path.node.start!,
          end: parts.at(-1)!.path.node.end!,
          jsxChild: true,
          nodes: parts.flatMap(item => item.nodes),
        })
      }
      parts = []
    }
    for (const part of run) {
      try {
        parts.push({
          ...part,
          nodes: await evaluate(part.path, part.expression),
        })
      } catch {
        flush()
      }
    }
    flush()
  }
  regions.sort((a, b) => a.start - b.start || b.end - a.end)
  let through = -1
  const component = source.path.scope.generateUidIdentifier('StaticScene').name
  for (const region of regions) {
    if (region.start < through) {
      continue
    }
    const line = region.path.node.loc?.start.line ?? 0
    try {
      const nodes = region.nodes ?? await evaluate(region.path, region.expression)
      const plan = optimizeScene(nodes, resolved)
      if (!plan.batches && !plan.bundles) {
        diagnostics.push({
          file: id,
          line,
          status: 'skipped',
          reason: 'Below thresholds or no interchangeable contiguous mesh family.',
        })
        continue
      }
      const serialized = JSON.stringify(plan)
      if (serialized.length > (options.maxPlanBytes ?? 1024 * 1024)) {
        throw new Error('Compiled scene exceeds maxPlanBytes.')
      }
      const hash = createHash('sha256').update(serialized).digest('hex').slice(0, 24)
      let name = imports.get(hash)
      if (!name) {
        name = source.path.scope.generateUidIdentifier('staticScene').name
        imports.set(hash, name)
        plans.set(hash, {
          hash,
          plan,
        })
      }
      const element = `<${component} compiled={${name}} />`
      // JSX arrays/expressions are replaced in their own existing expression container.
      output.overwrite(region.start, region.end, region.jsxChild && !t.isJSXElement(region.expression) && !t.isJSXFragment(region.expression) ? `{${element}}` : element)
      through = region.end
      diagnostics.push({
        file: id,
        line,
        status: 'optimized',
        batches: plan.batches,
        bundles: plan.bundles,
        objectsBefore: plan.objectsBefore,
        objectsAfter: plan.objectsAfter,
      })
    } catch (error) {
      diagnostics.push({
        file: id,
        line,
        status: 'skipped',
        reason: Error.isError(error) ? error.message : String(error),
      })
    }
  }
  if (plans.size) {
    const prefix = `\nimport {StaticScene as ${component}} from '${options.runtimeModule ?? 'vite-plugin-r3f-static-rendering/runtime'}';\n${[...imports].map(([hash, name]) => `import ${name} from 'virtual:r3f-static-rendering:${hash}';\n`).join('')}`
    const directiveEnd = source.ast.program.directives.at(-1)?.end ?? 0
    output.appendLeft(directiveEnd, prefix)
  }
  for (const diagnostic of diagnostics) {
    options.onDiagnostic?.(diagnostic)
  }
  return {
    code: output.toString(),
    map: output.generateMap({
      source: id,
      includeContent: true,
      hires: true,
    }),
    plans: [...plans.values()],
    diagnostics,
    dependencies,
  }
}
