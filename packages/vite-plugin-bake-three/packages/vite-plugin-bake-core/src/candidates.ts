import type SourceGraph from './SourceGraph.ts'
import type {BakeAdapter} from './types.ts'
import type {NodePath} from '@babel/traverse'

import * as t from '@babel/types'

import {importInfo} from './SourceGraph.ts'

export type Candidate = {
  body?: NodePath<t.BlockStatement | t.Expression>
  /** Successful custom candidates may replace coupled expressions as one atomic rewrite. */
  edits?: (factory: string) => ReadonlyArray<{
    end: number
    start: number
    text: string
  }>
  end?: number
  expression: t.CallExpression | t.NewExpression
  kind: 'class' | 'custom' | 'expression' | 'function'
  path: NodePath
  start?: number
}

/** Parameterless definitions can keep their public identity while dropping the entire generator body. */
export function definitionCandidate(path: NodePath): Candidate | undefined {
  if (path.isClassDeclaration() && path.node.id) {
    const constructor = path.get('body.body').find(member => member.isClassMethod({kind: 'constructor'}))
    if (constructor?.isClassMethod() ? constructor.node.params.length === 0 : !path.node.superClass) {
      return {
        path,
        expression: t.newExpression(t.identifier(path.node.id.name), []),
        kind: 'class',
      }
    }
  }
  if (path.isFunctionDeclaration() && path.node.id && path.node.params.length === 0) {
    return {
      path,
      expression: t.callExpression(t.identifier(path.node.id.name), []),
      kind: 'function',
      body: path.get('body'),
    }
  }
  if (path.isVariableDeclarator() && t.isIdentifier(path.node.id)) {
    const init = path.get('init')
    if ((init.isArrowFunctionExpression() || init.isFunctionExpression()) && init.node.params.length === 0) {
      return {
        path,
        expression: t.callExpression(t.identifier(path.node.id.name), []),
        kind: 'function',
        body: init.get('body'),
      }
    }
  }
}

/** Resolve import provenance, not names such as FooGeometry. */
export async function deferredDefinition(path: NodePath, graph: SourceGraph, adapter: BakeAdapter): Promise<NodePath | undefined> {
  if (!path.isCallExpression() && !path.isNewExpression()) {
    return
  }
  if (!t.isIdentifier(path.node.callee)) {
    return
  }
  let target = path.scope.getBinding(path.node.callee.name)?.path
  const visited = new Set<t.Node>
  while (target && !visited.has(target.node)) {
    visited.add(target.node)
    const imported = importInfo(target)
    if (!imported) {
      return definitionCandidate(target) ? target : undefined
    }
    if (!imported.source.startsWith('.') && !imported.source.startsWith('#') && !imported.source.startsWith('/')) {
      return
    }
    if (adapter.modules.has(imported.source) || imported.imported === '*') {
      return
    }
    const id = await graph.resolve(imported.source, graph.source(target).id)
    if (!id) {
      return
    }
    target = await graph.exported(id, imported.imported)
  }
}
