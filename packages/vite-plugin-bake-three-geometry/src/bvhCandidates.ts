import type {Binding, NodePath} from '@babel/traverse'
import type {BakeCandidate, SourceModule} from 'vite-plugin-bake-core'

import * as t from '@babel/types'
import {importInfo} from 'vite-plugin-bake-core'

const boundsMethods = new Set(['computeBoundingBox', 'computeBoundingSphere'])
/** Couple an owned, closed geometry initializer and its BVH without changing application source. */
export async function bvhCandidates(source: SourceModule): Promise<ReadonlyArray<BakeCandidate>> {
  const candidates: Array<BakeCandidate> = []
  source.path.traverse({NewExpression(path) {
    const candidate = pair(path); if (candidate) {
      candidates.push(candidate)
    }
  }})
  return candidates
}
function isBvh(path: NodePath<t.NewExpression>) {
  const callee = path.node.callee
  const name = t.isIdentifier(callee) ? callee.name : (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.object) && t.isIdentifier(callee.property, {name: 'MeshBVH'}) ? callee.object.name : undefined)
  if (!name) {
    return false
  }
  const binding = path.scope.getBinding(name)
  const imported = binding && importInfo(binding.path)
  return imported?.source === 'three-mesh-bvh' && (imported.imported === 'MeshBVH' || imported.imported === '*' && t.isMemberExpression(callee))
}
function storesInOwnedMap(statement: NodePath, geometry: string) {
  if (!statement.isExpressionStatement()) {
    return false
  }
  const call = statement.node.expression
  if (!t.isCallExpression(call) || call.arguments.length !== 2 || !t.isIdentifier(call.arguments[1], {name: geometry}) || !t.isLiteral(call.arguments[0])) {
    return false
  }
  const method = call.callee
  if (!t.isMemberExpression(method) || method.computed || !t.isIdentifier(method.property, {name: 'set'})) {
    return false
  }
  const receiver = method.object
  if (!t.isMemberExpression(receiver) || !t.isThisExpression(receiver.object) || receiver.computed || !t.isIdentifier(receiver.property)) {
    return false
  }
  const owner = statement.findParent(parent => parent.isClass())
  if (!owner?.isClass()) {
    return false
  }
  const propertyName = receiver.property.name
  let mutated = false
  owner.traverse({MemberExpression(member) {
    if (!t.isThisExpression(member.node.object) || member.node.computed || !t.isIdentifier(member.node.property, {name: propertyName})) {
      return
    }
    let target: NodePath = member
    while (target.parentPath?.isMemberExpression() && target.parentPath.node.object === target.node) {
      target = target.parentPath
    }
    const parent = target.parentPath
    if (parent?.isAssignmentExpression() && parent.node.left === target.node || parent?.isUpdateExpression() || parent?.isUnaryExpression({operator: 'delete'})) {
      mutated = true
    }
  }})
  if (mutated) {
    return false
  }
  return owner.node.body.body.some(field => t.isClassProperty(field) && !field.static && t.isIdentifier(field.key, {name: propertyName}) && t.isNewExpression(field.value) && t.isIdentifier(field.value.callee, {name: 'Map'}) && !statement.scope.getBinding('Map'))
}
function pair(path: NodePath<t.NewExpression>): BakeCandidate | undefined {
  if (!isBvh(path) || path.node.arguments.length > 2) {
    return
  }
  const argument = path.node.arguments[0]
  if (!t.isIdentifier(argument)) {
    return
  }
  const binding: Binding | undefined = path.scope.getBinding(argument.name)
  if (!binding?.constant || !binding.path.isVariableDeclarator() || !t.isExpression(binding.path.node.init) || !t.isIdentifier(binding.path.node.id)) {
    return
  }
  const declaration = binding.path.parentPath
  if (!declaration.isVariableDeclaration({kind: 'const'}) || declaration.node.declarations.length !== 1) {
    return
  }
  const block = declaration.parentPath
  if (!block.isBlockStatement() && !block.isProgram()) {
    return
  }
  const endStatement = path.getStatementParent()
  if (!endStatement || endStatement.parentPath !== block || !endStatement.isVariableDeclaration() || endStatement.node.declarations.length !== 1) {
    return
  }
  // Only a standalone initializer; no conditional/new expression is moved out of its branch.
  const treeDeclaration = endStatement.node.declarations[0]
  if (treeDeclaration.init !== path.node || !t.isIdentifier(treeDeclaration.id)) {
    return
  }
  const statements = block.get('body')
  const first = statements.indexOf(declaration)
  const last = statements.indexOf(endStatement)
  if (first === -1 || last <= first) {
    return
  }
  const initialization: Array<t.Statement> = []
  const removed: Array<NodePath> = []
  for (const statement of statements.slice(first + 1, last)) {
    const expression = statement.isExpressionStatement() ? statement.node.expression : undefined
    if (expression && t.isCallExpression(expression) && expression.arguments.length === 0 && t.isMemberExpression(expression.callee) && !expression.callee.computed && t.isIdentifier(expression.callee.object, {name: argument.name}) && t.isIdentifier(expression.callee.property) && boundsMethods.has(expression.callee.property.name)) {
      initialization.push(t.cloneNode(statement.node, true))
      removed.push(statement)
    } else if (!storesInOwnedMap(statement, argument.name)) {
      return
    }
  }
  // Do not move work across uses in other scopes, or a binding already visible before its initializer.
  if (binding.referencePaths.some(reference => reference.node.start! < declaration.node.start!)) {
    return
  }
  const initializer = binding.path.node.init
  const result = path.scope.generateUidIdentifier('bakedGeometryBvh')
  const tree = path.scope.generateUidIdentifier('tree')
  const expression = t.callExpression(t.arrowFunctionExpression([], t.blockStatement([
    t.variableDeclaration('const', [t.variableDeclarator(t.identifier(argument.name), t.cloneNode(binding.path.node.init, true))]),
    ...initialization,
    t.variableDeclaration('const', [t.variableDeclarator(tree, t.cloneNode(path.node, true))]),
    t.returnStatement(t.objectExpression([
      t.objectProperty(t.identifier('geometry'), t.identifier(argument.name)),
      t.objectProperty(t.identifier('tree'), t.cloneNode(tree)),
    ])),
  ])), [])
  return {
    kind: 'custom',
    path,
    expression,
    start: declaration.node.start!,
    end: path.node.end!,
    edits: factory => [
      {
        start: declaration.node.start!,
        end: declaration.node.start!,
        text: `const ${result.name} = ${factory}();\n`,
      },
      {
        start: initializer.start!,
        end: initializer.end!,
        text: `${result.name}.geometry`,
      },
      ...removed.map(statement => ({
        start: statement.node.start!,
        end: statement.node.end!,
        text: '',
      })),
      {
        start: path.node.start!,
        end: path.node.end!,
        text: `${result.name}.tree`,
      },
    ],
  }
}
