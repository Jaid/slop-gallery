import type {ResolveModule, SourceModule} from './types.ts'
import type {Binding, NodePath} from '@babel/traverse'

import {readFile} from 'node:fs/promises'

import {parse} from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

import {NotBakeableError} from './types.ts'

export function importInfo(path: NodePath) {
  if (!path.isImportSpecifier() && !path.isImportDefaultSpecifier() && !path.isImportNamespaceSpecifier()) {
    return
  }
  const declaration = path.parentPath
  if (!declaration.isImportDeclaration() || declaration.node.importKind === 'type') {
    throw new NotBakeableError('Type-only import.')
  }
  const imported = path.isImportDefaultSpecifier() ? 'default' : path.isImportNamespaceSpecifier() ? '*' : t.isIdentifier(path.node.imported) ? path.node.imported.name : path.node.imported.value
  return {
    source: declaration.node.source.value,
    imported,
  }
}

export default class SourceGraph {
  private readonly modules = new Map<string, Promise<SourceModule>>
  constructor(readonly resolve: ResolveModule) {}

  async exported(id: string, name: string, visited = new Set<string>, dependencies?: Set<string>): Promise<NodePath> {
    dependencies?.add(id)
    const key = `${id}:${name}`
    if (visited.has(key)) {
      throw new NotBakeableError('Cyclic re-export.')
    }
    visited.add(key)
    const module = await this.read(id)
    for (const statement of module.path.get('body')) {
      if (name === 'default' && statement.isExportDefaultDeclaration()) {
        const declaration = statement.get('declaration')
        if (declaration.isIdentifier()) {
          const binding = declaration.scope.getBinding(declaration.node.name)
          if (!binding) {
            break
          }
          return binding.path
        }
        return declaration
      }
      if (!statement.isExportNamedDeclaration()) {
        continue
      }
      for (const specifier of statement.get('specifiers')) {
        if (!specifier.isExportSpecifier()) {
          continue
        }
        const exported = specifier.node.exported
        if ((t.isIdentifier(exported) ? exported.name : exported.value) !== name) {
          continue
        }
        const local = t.isIdentifier(specifier.node.local) ? specifier.node.local.name : specifier.node.local.value
        if (statement.node.source) {
          const target = await this.resolve(statement.node.source.value, id)
          if (!target) {
            throw new NotBakeableError('Unresolved re-export.')
          }
          return this.exported(target, local, visited, dependencies)
        }
        const binding = specifier.scope.getBinding(local)
        if (binding) {
          return binding.path
        }
      }
      const declaration = statement.get('declaration')
      if (declaration.isFunctionDeclaration() || declaration.isClassDeclaration()) {
        if (declaration.node.id?.name === name) {
          return declaration
        }
      } else if (declaration.isVariableDeclaration()) {
        const binding = module.path.scope.getBinding(name)
        if (binding && binding.path.parentPath === declaration) {
          return binding.path
        }
      }
    }
    throw new NotBakeableError(`Cannot resolve export ${name}.`)
  }

  input(id: string, code: string) {
    return this.parse(id, code)
  }

  async read(id: string, code?: string): Promise<SourceModule> {
    let module = this.modules.get(id)
    if (!module) {
      module = this.parse(id, code)
      this.modules.set(id, module)
    }
    return module
  }

  source(path: NodePath): SourceModule {
    return path.scope.getProgramParent().path.getData('bakeSource') as SourceModule
  }

  private async parse(id: string, suppliedCode?: string): Promise<SourceModule> {
    if (id.includes('\0') || id.includes('?')) {
      throw new NotBakeableError('Virtual and query modules are not evaluated.')
    }
    const code = suppliedCode ?? await readFile(id, 'utf8')
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    })
    let path!: NodePath<t.Program>
    traverse(ast, {Program(program) {
      path = program; program.stop()
    }})
    const result = {
      id,
      code,
      ast,
      path,
    }
    path.setData('bakeSource', result)
    return result
  }
}

const mutators = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear'])

/** const only protects a binding; reject observable writes through its references as well. */
export function assertConstant(binding: Binding, visited = new Set<Binding>) {
  if (visited.has(binding)) {
    return
  }
  visited.add(binding)
  if (!binding.constant || binding.constantViolations.length) {
    throw new NotBakeableError(`Mutable binding: ${binding.identifier.name}.`)
  }
  for (const reference of binding.referencePaths) {
    let path: NodePath = reference
    while (path.parentPath?.isMemberExpression() && path.parentPath.node.object === path.node) {
      path = path.parentPath
    }
    const parent = path.parentPath
    if (parent?.isVariableDeclarator() && parent.node.init === path.node && t.isIdentifier(parent.node.id)) {
      const alias = parent.scope.getBinding(parent.node.id.name)
      if (alias) {
        assertConstant(alias, visited)
      }
    }
    if (parent?.isCallExpression() && parent.node.arguments[0] === path.node && t.isMemberExpression(parent.node.callee) && t.isIdentifier(parent.node.callee.object, {name: 'Object'}) && t.isIdentifier(parent.node.callee.property) && ['assign', 'defineProperties', 'defineProperty', 'setPrototypeOf'].includes(parent.node.callee.property.name)) {
      throw new NotBakeableError('A captured dependency is mutated by Object methods.')
    }
    if (parent?.isAssignmentExpression() && parent.node.left === path.node || parent?.isUpdateExpression() || parent?.isUnaryExpression({operator: 'delete'})) {
      throw new NotBakeableError(`Mutated dependency: ${binding.identifier.name}.`)
    }
    if (parent?.isCallExpression() && parent.node.callee === path.node && path.isMemberExpression() && !path.node.computed && t.isIdentifier(path.node.property) && mutators.has(path.node.property.name)) {
      throw new NotBakeableError(`Mutated dependency: ${binding.identifier.name}.`)
    }
  }
}
