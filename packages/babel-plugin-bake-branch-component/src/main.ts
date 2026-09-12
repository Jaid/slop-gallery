import type {NodePath, PluginPass} from '@babel/core'

import {types as t} from '@babel/core'
import {addNamed} from '@babel/helper-module-imports'
import {declare} from '@babel/helper-plugin-utils'
import template from '@babel/template'

const branchModule = 'branch-component'
const conditionNames = ['if', 'not', 'some', 'none', 'all'] as const
const supportedNames = new Set([...conditionNames, 'then', 'else', 'children'])
const outputHelperTemplate = template.statement(`
  const %%helper%% = (%%output%%) =>
    typeof %%output%% === "function"
      ? %%createElement%%(%%output%%)
      : %%output%% ?? null
`)

type BranchConditionName = typeof conditionNames[number]
type BakeState = {
  branchImports?: Map<string, NodePath<t.ImportDefaultSpecifier>>
  outputHelperId?: t.Identifier
}
type PluginState = BakeState & PluginPass
type BranchAttributes = Map<string, t.Expression>

const expressionFromAttribute = (path: NodePath<t.JSXElement>, attribute: t.JSXAttribute): t.Expression => {
  if (attribute.value === null) {
    return t.booleanLiteral(true)
  }
  if (t.isStringLiteral(attribute.value)) {
    return t.cloneNode(attribute.value)
  }
  if (t.isJSXExpressionContainer(attribute.value) && !t.isJSXEmptyExpression(attribute.value.expression)) {
    return t.cloneNode(attribute.value.expression, true)
  }
  throw path.buildCodeFrameError('Unsupported Branch attribute value.')
}
const readAttributes = (path: NodePath<t.JSXElement>): BranchAttributes => {
  const attributes: BranchAttributes = new Map
  for (const attribute of path.node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attribute)) {
      throw path.buildCodeFrameError('Branch does not support spread attributes when compiled.')
    }
    if (!t.isJSXIdentifier(attribute.name)) {
      throw path.buildCodeFrameError('Branch attributes must use plain names.')
    }
    const name = attribute.name.name
    if (!supportedNames.has(name)) {
      throw path.buildCodeFrameError(`Unsupported Branch attribute “${name}”.`)
    }
    if (attributes.has(name)) {
      throw path.buildCodeFrameError(`Duplicate Branch attribute “${name}”.`)
    }
    attributes.set(name, expressionFromAttribute(path, attribute))
  }
  return attributes
}
const collectionCondition = (expression: t.Expression, method: 'every' | 'some'): t.Expression => {
  const member = t.optionalMemberExpression(expression, t.identifier(method), false, true)
  return t.optionalCallExpression(member, [t.identifier('Boolean')], false)
}
const buildCondition = (name: BranchConditionName, expression: t.Expression): t.Expression => {
  switch (name) {
    case 'if': { return expression }
    case 'not': { return t.unaryExpression('!', expression, true) }
    case 'some': { return collectionCondition(expression, 'some') }
    case 'none': { return t.unaryExpression('!', collectionCondition(expression, 'some'), true) }
    case 'all': { return collectionCondition(expression, 'every') }
  }
}
const findNamedImport = (path: NodePath<t.Program>, source: string, importedName: string): t.Identifier | undefined => {
  for (const statement of path.get('body')) {
    if (!statement.isImportDeclaration() || statement.node.source.value !== source) {
      continue
    }
    for (const specifier of statement.get('specifiers')) {
      if (!specifier.isImportSpecifier()) {
        continue
      }
      const imported = specifier.node.imported
      if (t.isIdentifier(imported, {name: importedName}) || t.isStringLiteral(imported, {value: importedName})) {
        return t.cloneNode(specifier.node.local)
      }
    }
  }
}
const getNamedImport = (path: NodePath<t.Program>, source: string, importedName: string): t.Identifier => findNamedImport(path, source, importedName) ?? addNamed(path, importedName, source, {
  importedType: 'es6',
  importPosition: 'after',
  nameHint: importedName,
})
const getOutputHelperId = (state: PluginState): t.Identifier => {
  state.outputHelperId ??= state.file.path.scope.generateUidIdentifier('renderBranchOutput')
  return state.outputHelperId
}
const renderOutput = (expression: t.Expression, state: PluginState): t.Expression => t.callExpression(t.cloneNode(getOutputHelperId(state)), [expression])
const buildChildren = (path: NodePath<t.JSXElement>, attributes: BranchAttributes): Array<t.Expression> => {
  const explicitChildren = attributes.get('children')
  const nestedChildren = t.react.buildChildren(path.node).map(child => {
    if (!t.isExpression(child)) {
      throw path.buildCodeFrameError('Branch does not support spread children when compiled.')
    }
    return t.cloneNode(child, true)
  })
  if (explicitChildren !== undefined && nestedChildren.length) {
    throw path.buildCodeFrameError('Branch cannot compile both a children attribute and nested children.')
  }
  return explicitChildren === undefined ? nestedChildren : [explicitChildren]
}
const undefinedExpression = (): t.UnaryExpression => t.unaryExpression('void', t.numericLiteral(0), true)
const childrenOutput = (children: Array<t.Expression>): t.Expression => {
  if (children.length === 0) {
    return undefinedExpression()
  }
  if (children.length === 1) {
    return children[0]
  }
  return t.arrayExpression(children)
}
const fragmentOutput = (outputs: Array<t.Expression>): t.JSXFragment => {
  const children = outputs.map(output => {
    if (t.isJSXElement(output) || t.isJSXFragment(output)) {
      return output
    }
    return t.jsxExpressionContainer(output)
  })
  return t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children)
}
const buildOutput = (path: NodePath<t.JSXElement>, attributes: BranchAttributes, state: PluginState): t.Expression => {
  const children = buildChildren(path, attributes)
  const thenOutput = attributes.get('then')
  if (thenOutput === undefined) {
    return childrenOutput(children)
  }
  const renderedThen = renderOutput(thenOutput, state)
  return children.length ? fragmentOutput([renderedThen, ...children]) : renderedThen
}
const buildFailureOutput = (attributes: BranchAttributes, state: PluginState): t.Expression => {
  const elseOutput = attributes.get('else')
  return elseOutput === undefined ? t.nullLiteral() : renderOutput(elseOutput, state)
}
const isBranchElement = (path: NodePath<t.JSXElement>, state: PluginState): boolean => {
  const name = path.node.openingElement.name
  if (!t.isJSXIdentifier(name)) {
    return false
  }
  const importPath = state.branchImports?.get(name.name)
  return importPath !== undefined && path.scope.getBinding(name.name)?.path === importPath
}
const replaceBranch = (path: NodePath<t.JSXElement>, state: PluginState) => {
  const attributes = readAttributes(path)
  const conditions = conditionNames.flatMap(name => {
    const expression = attributes.get(name)
    return expression === undefined ? [] : [buildCondition(name, expression)]
  })
  if (!conditions.length) {
    throw path.buildCodeFrameError('Compiled Branch requires at least one condition.')
  }
  const condition = conditions.reduce((left, right) => t.logicalExpression('&&', left, right))
  const expression = t.conditionalExpression(condition, buildOutput(path, attributes, state), buildFailureOutput(attributes, state))
  if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
    path.replaceWith(t.jsxExpressionContainer(expression))
  } else {
    path.replaceWith(expression)
  }
}
const removeUnusedBranchImports = (path: NodePath<t.Program>, state: PluginState) => {
  if (!state.branchImports) {
    return
  }
  path.scope.crawl()
  const declarations = new Set<NodePath<t.ImportDeclaration>>
  for (const [local, importPath] of state.branchImports) {
    const declaration = importPath.parentPath
    if (declaration.isImportDeclaration()) {
      declarations.add(declaration)
    }
    if (!path.scope.getBinding(local)?.referenced) {
      importPath.remove()
    }
  }
  for (const declaration of declarations) {
    if (!declaration.removed && declaration.node.specifiers.length === 0) {
      declaration.remove()
    }
  }
}
const addOutputHelper = (path: NodePath<t.Program>, state: PluginState) => {
  if (!state.outputHelperId) {
    return
  }
  const createElement = getNamedImport(path, 'react', 'createElement')
  const output = path.scope.generateUidIdentifier('output')
  const helper = outputHelperTemplate({
    createElement,
    helper: t.cloneNode(state.outputHelperId),
    output,
  })
  const lastImport = path.get('body').findLast(statement => statement.isImportDeclaration())
  if (lastImport) {
    lastImport.insertAfter(helper)
  } else {
    path.unshiftContainer('body', helper)
  }
}

export default declare<BakeState>(api => {
  api.assertVersion('^8.0.0')
  return {
    name: 'bake-branch-component',
    visitor: {
      Program: {
        enter(path, state) {
          state.branchImports = new Map
          state.outputHelperId = undefined
          for (const statement of path.get('body')) {
            if (!statement.isImportDeclaration() || statement.node.source.value !== branchModule) {
              continue
            }
            for (const specifier of statement.get('specifiers')) {
              if (specifier.isImportDefaultSpecifier()) {
                state.branchImports.set(specifier.node.local.name, specifier)
              }
            }
          }
        },
        exit(path, state) {
          removeUnusedBranchImports(path, state)
          addOutputHelper(path, state)
        },
      },
      JSXElement: {
        exit(path, state) {
          if (isBranchElement(path, state)) {
            replaceBranch(path, state)
          }
        },
      },
    },
  }
})
