import type {NodePath, PluginPass} from '@babel/core'

import {Buffer} from 'node:buffer'

import {types as t} from '@babel/core'
import {declare} from '@babel/helper-plugin-utils'

export type HoistPopularConstantsOptions = {
  /** Join pooled strings into one split-backed destructuring initializer when smaller. Defaults to true and requires stableBuiltins. */
  join?: boolean
  minimumOccurrences?: number
  minimumSavingsBytes?: number
  /** Assume unbound built-in objects are stable, enabling constant properties such as Math.PI and Number.NaN to be pooled. */
  stableBuiltins?: boolean
}

type PopularLiteral = t.BigIntLiteral | t.BooleanLiteral | t.NullLiteral | t.NumericLiteral | t.StringLiteral
type PopularLiteralPath = NodePath<t.BigIntLiteral> | NodePath<t.BooleanLiteral> | NodePath<t.NullLiteral> | NodePath<t.NumericLiteral> | NodePath<t.StringLiteral>
type CandidateExpression = PopularLiteral | t.MemberExpression
type CandidatePath = NodePath<t.MemberExpression> | PopularLiteralPath
type Candidate = {
  expression: CandidateExpression
  expressionBytes: number
  occurrences: number
  paths: Array<CandidatePath>
  rawBytes: number
}
type HoistState = {
  candidates?: Map<string, Candidate>
  hasDirectEval?: boolean
}
type HoistPluginState = HoistState & PluginPass
type HoistedCandidate = {
  candidate: Candidate
  identifier: t.Identifier
}

const firstIdentifierCharacters = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const identifierCharacters = `${firstIdentifierCharacters}0123456789`
const joinCandidates = " _-\"',.`|:;!#$%&([{)]}/\\*+<=>?@^~abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\t\n\r"
const stableBuiltinConstants = new Map([
  ['Math', new Set([
    'E',
    'LN10',
    'LN2',
    'LOG10E',
    'LOG2E',
    'PI',
    'SQRT1_2',
    'SQRT2',
  ])],
  ['Number', new Set([
    'EPSILON',
    'MAX_SAFE_INTEGER',
    'MAX_VALUE',
    'MIN_SAFE_INTEGER',
    'MIN_VALUE',
    'NaN',
    'NEGATIVE_INFINITY',
    'POSITIVE_INFINITY',
  ])],
])
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
const isStableBuiltinRead = (path: NodePath<t.MemberExpression>) => {
  if (!path.isReferenced()) {
    return false
  }
  const parent = path.parentPath
  if (parent.isUpdateExpression() || parent.isUnaryExpression({operator: 'delete'}) && path.key === 'argument') {
    return false
  }
  if ((parent.isAssignmentExpression() || parent.isForInStatement() || parent.isForOfStatement()) && path.key === 'left') {
    return false
  }
  return !path.findParent(ancestor => ancestor.isArrayPattern()
    || ancestor.isAssignmentPattern()
    || ancestor.isObjectPattern()
    || ancestor.isRestElement())
}
const addCandidate = (path: CandidatePath, state: HoistPluginState, key: string, raw: string) => {
  const candidates = state.candidates!
  const bytes = Buffer.byteLength(raw)
  const candidate = candidates.get(key)
  if (candidate) {
    candidate.occurrences++
    candidate.paths.push(path)
    candidate.rawBytes += bytes
    if (bytes < candidate.expressionBytes) {
      candidate.expression = t.cloneNode(path.node)
      candidate.expressionBytes = bytes
    }
    return
  }
  candidates.set(key, {
    expression: t.cloneNode(path.node),
    expressionBytes: bytes,
    occurrences: 1,
    paths: [path],
    rawBytes: bytes,
  })
}
const addLiteralCandidate = (path: PopularLiteralPath, state: HoistPluginState) => {
  if (!isHoistable(path)) {
    return
  }
  addCandidate(path, state, literalKey(path.node), literalRaw(path.node))
}
const addStableBuiltinCandidate = (path: NodePath<t.MemberExpression>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  if (!options.stableBuiltins || path.node.computed || !isStableBuiltinRead(path)) {
    return
  }
  if (!t.isIdentifier(path.node.object) || path.scope.getBinding(path.node.object.name)) {
    return
  }
  const constants = stableBuiltinConstants.get(path.node.object.name)
  if (!constants || !t.isIdentifier(path.node.property) || !constants.has(path.node.property.name)) {
    return
  }
  const raw = `${path.node.object.name}.${path.node.property.name}`
  addCandidate(path, state, `builtin:${raw}`, raw)
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
  return candidate.rawBytes - ((candidate.occurrences + 1) * identifierLength + candidate.expressionBytes + declarationOverhead)
}
const generatedStringBytes = (value: string) => Buffer.byteLength(JSON.stringify(value))
const findJoinSeparator = (values: Array<string>) => {
  for (const candidate of joinCandidates) {
    if (Buffer.byteLength(candidate) === 1 && values.every(value => !value.includes(candidate))) {
      return candidate
    }
  }
}
const joinedStringDeclaration = (strings: Array<HoistedCandidate>) => {
  if (strings.length < 2) {
    return
  }
  const values = strings.map(({candidate}) => {
    if (!t.isStringLiteral(candidate.expression)) {
      throw new TypeError('Expected a string literal candidate.')
    }
    return candidate.expression.value
  })
  const separator = findJoinSeparator(values)
  if (separator === undefined) {
    return
  }
  const identifiersBytes = strings.reduce((bytes, {identifier}) => bytes + Buffer.byteLength(identifier.name), 0)
  const ordinaryBytes = identifiersBytes
    + strings.reduce((bytes, {candidate}) => bytes + 1 + generatedStringBytes((candidate.expression as t.StringLiteral).value), 0)
    + strings.length - 1
  const joinedValue = values.join(separator)
  const joinedBytes = 2 + identifiersBytes + strings.length - 1
    + 1 + generatedStringBytes(joinedValue)
    + 7 + generatedStringBytes(separator) + 1
  if (ordinaryBytes - joinedBytes < 1) {
    return
  }
  const split = t.callExpression(
    t.memberExpression(t.stringLiteral(joinedValue), t.identifier('split')),
    [t.stringLiteral(separator)],
  )
  return t.variableDeclarator(t.arrayPattern(strings.map(({identifier}) => t.cloneNode(identifier))), split)
}
const declarationsFor = (hoisted: Array<HoistedCandidate>, options: HoistPopularConstantsOptions) => {
  let joinedStrings: t.VariableDeclarator | undefined
  if (options.stableBuiltins && (options.join ?? true)) {
    joinedStrings = joinedStringDeclaration(hoisted.filter(({candidate}) => t.isStringLiteral(candidate.expression)))
  }
  if (!joinedStrings) {
    return hoisted.map(({candidate, identifier}) => t.variableDeclarator(identifier, t.cloneNode(candidate.expression)))
  }
  const declarations: Array<t.VariableDeclarator> = []
  let emittedJoinedStrings = false
  for (const item of hoisted) {
    if (t.isStringLiteral(item.candidate.expression)) {
      if (!emittedJoinedStrings) {
        declarations.push(joinedStrings)
        emittedJoinedStrings = true
      }
      continue
    }
    declarations.push(t.variableDeclarator(item.identifier, t.cloneNode(item.candidate.expression)))
  }
  return declarations
}
const hoistCandidates = (path: NodePath<t.Program>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  if (state.hasDirectEval) {
    return false
  }
  const minimumOccurrences = options.minimumOccurrences ?? 2
  const minimumSavingsBytes = options.minimumSavingsBytes ?? 1
  const remaining: Array<Candidate> = []
  for (const candidate of state.candidates!.values()) {
    if (candidate.occurrences >= minimumOccurrences) {
      remaining.push(candidate)
    }
  }
  if (!remaining.length) {
    return false
  }
  path.scope.crawl()
  const chosen = new Set<string>
  const hoisted: Array<HoistedCandidate> = []
  let identifierIndex = 0
  while (remaining.length) {
    const next = nextIdentifier(path, chosen, identifierIndex)
    const first = hoisted.length === 0
    let bestIndex = -1
    let bestSavings = Number.NEGATIVE_INFINITY
    for (const [index, candidate] of remaining.entries()) {
      const savings = estimatedSavings(candidate, next.name.length, first)
      if (!(savings > bestSavings)) {
        continue
      }
      bestIndex = index
      bestSavings = savings
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
    hoisted.push({
      candidate,
      identifier,
    })
  }
  if (!hoisted.length) {
    return false
  }
  path.unshiftContainer('body', t.variableDeclaration('var', declarationsFor(hoisted, options)))
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
        addLiteralCandidate(path, state)
      },
      BooleanLiteral(path, state) {
        addLiteralCandidate(path, state)
      },
      MemberExpression(path, state) {
        addStableBuiltinCandidate(path, state, options)
      },
      NullLiteral(path, state) {
        addLiteralCandidate(path, state)
      },
      NumericLiteral(path, state) {
        addLiteralCandidate(path, state)
      },
      StringLiteral(path, state) {
        addLiteralCandidate(path, state)
      },
    },
  }
})
