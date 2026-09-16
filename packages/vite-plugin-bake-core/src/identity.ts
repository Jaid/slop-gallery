import type {NativeType} from './types.ts'
import type {File} from '@babel/types'

import traverse from '@babel/traverse'
import * as t from '@babel/types'

import {NotBakeableError} from './types.ts'

const identities = new Set(['id', 'uuid', 'version'])

/** Generated identities cannot be frozen into other fields while resources receive fresh IDs. */
export function identityAccess(types: ReadonlyArray<NativeType>) {
  return (value: unknown, key: string) => {
    if (value && typeof value === 'object' && types.some(type => type.omit?.includes(key) && type.prototype.isPrototypeOf(value))) {
      throw new NotBakeableError('Native resource identity must remain runtime-dependent.')
    }
    return value
  }
}

export function guardIdentities(ast: File) {
  traverse(ast, {
    MemberExpression: {
      exit(path) {
        const property = path.node.property
        const name = path.node.computed ? t.isStringLiteral(property) && property.value : t.isIdentifier(property) && property.name
        if (name && identities.has(name) && t.isExpression(path.node.object)) {
          // Guard the receiver, retaining the original getter, assignment or method-call semantics.
          path.node.object = t.callExpression(t.identifier('__bakeIdentityAccess'), [path.node.object, t.stringLiteral(name)])
        }
      },
    },
  })
}
