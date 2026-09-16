import type {NodePath, PluginPass} from '@babel/core'

import {Buffer} from 'node:buffer'

import {types as t} from '@babel/core'
import {declare} from '@babel/helper-plugin-utils'

export type HoistPopularConstantsOptions = {
  minimumOccurrences?: number
  minimumSavingsBytes?: number
}

type PopularLiteral = t.BigIntLiteral | t.BooleanLiteral | t.NullLiteral | t.NumericLiteral | t.StringLiteral
type PopularLiteralPath = NodePath<t.BigIntLiteral> | NodePath<t.BooleanLiteral> | NodePath<t.NullLiteral> | NodePath<t.NumericLiteral> | NodePath<t.StringLiteral>
type Candidate = {
  literal: PopularLiteral
  literalBytes: number
  occurrences: number
  paths: Array<PopularLiteralPath>
  rawBytes: number
}
type HoistState = {
  candidates?: Map<string, Candidate>
  hasDirectEval?: boolean
}
type HoistPluginState = HoistState & PluginPass

const firstIdentifierCharacters = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const identifierCharacters = `${firstIdentifierCharacters}0123456789`
const identifierFromIndex = (index: number) => {
  let remainder = index
  let name = firstIdentifierCharacters[remainder % firstIdentifierCharacters.length]
  remainder = Math.floor(remainder / firstIdentifierCharacters.length)
  while (remainder) {
    remainder--
    name += identifierCharacters[remainder % identifierCharacters.length]
    remainder = Math.floor(remainder / identifierCharacters.length)
  }
  return name
}
const literalKey = (node: PopularLiteral) => {
  if (t.isStringLiteral(node)) {
    return `string:${node.value}`
  }
  if (t.isNumericLiteral(node)) {
    return `number:${Object.is(node.value, -0) ? '-0' : String(node.value)}`
  }
  if (t.isBigIntLiteral(node)) {
    return `bigint:${String(node.value)}`
  }
  if (t.isBooleanLiteral(node)) {
    return `boolean:${node.value}`
  }
  return 'null'
}
const literalRaw = (node: PopularLiteral) => {
  const raw = node.extra?.raw
  if (typeof raw === 'string') {
    return raw
  }
  if (t.isStringLiteral(node)) {
    return JSON.stringify(node.value)
  }
  if (t.isBigIntLiteral(node)) {
    return `${String(node.value)}n`
  }
  if (t.isNullLiteral(node)) {
    return 'null'
  }
  return String(node.value)
}
const isModuleSpecifier = (path: PopularLiteralPath) => {
  const parent = path.parentPath
  if ((parent.isImportDeclaration() || parent.isExportNamedDeclaration() || parent.isExportAllDeclaration()) && path.key === 'source') {
    return true
  }
  if (parent.isImportExpression() && path.key === 'source') {
    return true
  }
  return parent.isImportAttribute()
}
const isHoistable = (path: PopularLiteralPath) => {
  if (!path.isReferenced() || isModuleSpecifier(path)) {
    return false
  }
  return !(path.parentPath.isUnaryExpression({operator: 'delete'}) && path.key === 'argument')
}
const addCandidate = (path: PopularLiteralPath, state: HoistPluginState) => {
  if (!isHoistable(path)) {
    return
  }
  const candidates = state.candidates!
  const key = literalKey(path.node)
  const raw = literalRaw(path.node)
  const bytes = Buffer.byteLength(raw)
  const candidate = candidates.get(key)
  if (candidate) {
    candidate.occurrences++
    candidate.paths.push(path)
    candidate.rawBytes += bytes
    if (bytes < candidate.literalBytes) {
      candidate.literal = t.cloneNode(path.node)
      candidate.literalBytes = bytes
    }
    return
  }
  candidates.set(key, {
    literal: t.cloneNode(path.node),
    literalBytes: bytes,
    occurrences: 1,
    paths: [path],
    rawBytes: bytes,
  })
}
const isIdentifierAvailable = (path: NodePath<t.Program>, chosen: ReadonlySet<string>, name: string) => t.isValidIdentifier(name, true)
  && !chosen.has(name)
  && !path.scope.hasBinding(name)
  && !path.scope.hasGlobal(name)
  && !path.scope.hasReference(name)
  && !path.scope.hasUid(name)
const nextIdentifier = (path: NodePath<t.Program>, chosen: ReadonlySet<string>, start: number) => {
  let index = start
  while (true) {
    const name = identifierFromIndex(index++)
    if (isIdentifierAvailable(path, chosen, name)) {
      return {
        index,
        name,
      }
    }
  }
}
const estimatedSavings = (candidate: Candidate, identifierLength: number, first: boolean) => {
  const declarationOverhead = first ? 6 : 2
  return candidate.rawBytes - ((candidate.occurrences + 1) * identifierLength + candidate.literalBytes + declarationOverhead)
}
const hoistCandidates = (path: NodePath<t.Program>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  if (state.hasDirectEval) {
    return false
  }
  const minimumOccurrences = options.minimumOccurrences ?? 2
  const minimumSavingsBytes = options.minimumSavingsBytes ?? 1
  const remaining = [...state.candidates!.values()].filter(candidate => candidate.occurrences >= minimumOccurrences)
  if (!remaining.length) {
    return false
  }
  path.scope.crawl()
  const chosen = new Set<string>
  const declarations: Array<t.VariableDeclarator> = []
  let identifierIndex = 0
  while (remaining.length) {
    const next = nextIdentifier(path, chosen, identifierIndex)
    const first = declarations.length === 0
    let bestIndex = -1
    let bestSavings = Number.NEGATIVE_INFINITY
    for (const [index, candidate] of remaining.entries()) {
      const savings = estimatedSavings(candidate, next.name.length, first)
      if (savings > bestSavings) {
        bestIndex = index
        bestSavings = savings
      }
    }
    if (bestSavings < minimumSavingsBytes) {
      break
    }
    identifierIndex = next.index
    chosen.add(next.name)
    const candidate = remaining.splice(bestIndex, 1)[0]
    const identifier = t.identifier(next.name)
    for (const candidatePath of candidate.paths) {
      candidatePath.replaceWith(t.cloneNode(identifier))
    }
    declarations.push(t.variableDeclarator(identifier, t.cloneNode(candidate.literal)))
  }
  if (!declarations.length) {
    return false
  }
  path.unshiftContainer('body', t.variableDeclaration('var', declarations))
  return true
}

export default declare<HoistState, HoistPopularConstantsOptions>((api, options) => {
  api.assertVersion('^8.0.0')
  return {
    name: 'hoist-popular-constants',
    visitor: {
      Program: {
        enter(_path, state) {
          state.candidates = new Map
          state.hasDirectEval = false
        },
        exit(path, state) {
          if (hoistCandidates(path, state, options)) {
            state.file.metadata.hoistPopularConstants = true
          }
        },
      },
      CallExpression(path, state) {
        if (t.isIdentifier(path.node.callee, {name: 'eval'}) && !path.scope.getBinding('eval')) {
          state.hasDirectEval = true
        }
      },
      BigIntLiteral(path, state) {
        addCandidate(path, state)
      },
      BooleanLiteral(path, state) {
        addCandidate(path, state)
      },
      NullLiteral(path, state) {
        addCandidate(path, state)
      },
      NumericLiteral(path, state) {
        addCandidate(path, state)
      },
      StringLiteral(path, state) {
        addCandidate(path, state)
      },
    },
  }
})
