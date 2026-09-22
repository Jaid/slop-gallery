import type {NodePath, PluginPass} from '@babel/core'

import {Buffer} from 'node:buffer'

import {types as t} from '@babel/core'
import {declare} from '@babel/helper-plugin-utils'
import sortShortestLevenshtein from 'sort-shortest-levenshtein'

export type HoistPopularConstantsOptions = {
  /** Pack pooled strings into compact destructuring initializers when smaller. Defaults to true and requires stableBuiltins. */
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
type CandidateOccurrence = {
  computedObjectKey: boolean
  path: CandidatePath
}
type Candidate = {
  expression: CandidateExpression
  expressionBytes: number
  occurrences: number
  paths: Array<CandidateOccurrence>
  rawBytes: number
  replacementOverheadBytes: number
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
const isObjectLiteralKey = (path: PopularLiteralPath) => {
  const parent = path.parentPath
  if (!(parent.isObjectProperty() || parent.isObjectMethod()) || path.key !== 'key' || parent.node.computed || !parent.parentPath.isObjectExpression()) {
    return false
  }
  return !t.isStringLiteral(path.node, {value: '__proto__'})
}
const isHoistable = (path: PopularLiteralPath) => {
  if (isObjectLiteralKey(path)) {
    return true
  }
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
const addCandidate = (path: CandidatePath, state: HoistPluginState, key: string, raw: string, computedObjectKey = false) => {
  const candidates = state.candidates!
  const bytes = Buffer.byteLength(raw)
  const replacementOverheadBytes = computedObjectKey ? 2 : 0
  const candidate = candidates.get(key)
  if (candidate) {
    candidate.occurrences++
    candidate.paths.push({
      computedObjectKey,
      path,
    })
    candidate.rawBytes += bytes
    candidate.replacementOverheadBytes += replacementOverheadBytes
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
    paths: [{
      computedObjectKey,
      path,
    }],
    rawBytes: bytes,
    replacementOverheadBytes,
  })
}
const addLiteralCandidate = (path: PopularLiteralPath, state: HoistPluginState) => {
  if (!isHoistable(path)) {
    return
  }
  addCandidate(path, state, literalKey(path.node), literalRaw(path.node), isObjectLiteralKey(path))
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
  return candidate.rawBytes - ((candidate.occurrences + 1) * identifierLength + candidate.expressionBytes + candidate.replacementOverheadBytes + declarationOverhead)
}
type StringEntry = HoistedCandidate & {
  value: string
}
type DeclaratorPlan = {
  declarators: Array<t.VariableDeclarator>
  sizes: Array<number>
}
type StringDeclarationPlan = {
  extraStatements: Array<t.VariableDeclaration>
  mainDeclarators: Array<t.VariableDeclarator>
}

const generatedStringBytes = (value: string) => Buffer.byteLength(JSON.stringify(value))
const generatedStringHasEscape = (value: string) => generatedStringBytes(value) > Buffer.byteLength(value) + 2
const findJoinSeparator = (values: Array<string>) => {
  for (const candidate of joinCandidates) {
    if (!generatedStringHasEscape(candidate) && values.every(value => !value.includes(candidate))) {
      return candidate
    }
  }
}
const stringEntries = (strings: Array<HoistedCandidate>) => strings.map(item => {
  if (!t.isStringLiteral(item.candidate.expression)) {
    throw new TypeError('Expected a string literal candidate.')
  }
  return {
    ...item,
    value: item.candidate.expression.value,
  }
})
const sortStringEntries = (entries: Array<StringEntry>) => sortShortestLevenshtein(entries, entry => entry.value)
const patternBytes = (entries: Array<StringEntry>) => 2
  + entries.reduce((bytes, {identifier}) => bytes + Buffer.byteLength(identifier.name), 0)
  + Math.max(0, entries.length - 1)
const ordinaryStringPlan = (entries: Array<StringEntry>): DeclaratorPlan => ({
  declarators: entries.map(({identifier, value}) => t.variableDeclarator(t.cloneNode(identifier), t.stringLiteral(value))),
  sizes: entries.map(({identifier, value}) => Buffer.byteLength(identifier.name) + 1 + generatedStringBytes(value)),
})
const declaratorListBytes = (sizes: Array<number>) => sizes.reduce((total, bytes) => total + bytes, 0) + Math.max(0, sizes.length - 1)
const incrementalMainBytes = (sizes: Array<number>, hasOtherDeclarators: boolean) => {
  if (!sizes.length) {
    return 0
  }
  return declaratorListBytes(sizes) + (hasOtherDeclarators ? 1 : 4)
}
const splitStringPlan = (inputEntries: Array<StringEntry>) => {
  if (inputEntries.length < 2) {
    return
  }
  const entries = sortStringEntries(inputEntries)
  const values = entries.map(({value}) => value)
  const separator = findJoinSeparator(values)
  if (separator === undefined) {
    return
  }
  const joinedValue = values.join(separator)
  const split = t.callExpression(
    t.memberExpression(t.stringLiteral(joinedValue), t.identifier('split')),
    [t.stringLiteral(separator)],
  )
  const declarator = t.variableDeclarator(t.arrayPattern(entries.map(({identifier}) => t.cloneNode(identifier))), split)
  const bytes = patternBytes(entries)
    + 1 + generatedStringBytes(joinedValue)
    + 7 + generatedStringBytes(separator) + 1
  return {
    declarators: [declarator],
    sizes: [bytes],
  } satisfies DeclaratorPlan
}
const bestMainStringPlan = (entries: Array<StringEntry>): DeclaratorPlan => {
  const ordinary = ordinaryStringPlan(entries)
  const split = splitStringPlan(entries)
  if (!split || declaratorListBytes(ordinary.sizes) - declaratorListBytes(split.sizes) < 1) {
    return ordinary
  }
  return split
}
const isSingleCodePoint = (value: string) => {
  const iterator = value[Symbol.iterator]()
  if (iterator.next().done) {
    return false
  }
  return Boolean(iterator.next().done)
}
const directCharacterPlan = (inputEntries: Array<StringEntry>) => {
  if (!inputEntries.length) {
    return
  }
  const entries = sortStringEntries(inputEntries)
  const joinedValue = entries.map(({value}) => value).join('')
  const declarator = t.variableDeclarator(
    t.arrayPattern(entries.map(({identifier}) => t.cloneNode(identifier))),
    t.stringLiteral(joinedValue),
  )
  return {
    declarator,
    bytes: patternBytes(entries) + 1 + generatedStringBytes(joinedValue),
  }
}
const optimizeStringDeclarations = (strings: Array<HoistedCandidate>, hasOtherDeclarators: boolean): StringDeclarationPlan => {
  const entries = stringEntries(strings)
  const baseline = bestMainStringPlan(entries)
  const characters = entries.filter(({value}) => isSingleCodePoint(value))
  const nonCharacters = entries.filter(({value}) => !isSingleCodePoint(value))
  const directCharacters = directCharacterPlan(characters)
  if (!directCharacters) {
    return {
      extraStatements: [],
      mainDeclarators: baseline.declarators,
    }
  }
  const remaining = bestMainStringPlan(nonCharacters)
  const baselineBytes = incrementalMainBytes(baseline.sizes, hasOtherDeclarators)
  const extractedBytes = incrementalMainBytes(remaining.sizes, hasOtherDeclarators) + directCharacters.bytes + 4
  if (extractedBytes > baselineBytes) {
    return {
      extraStatements: [],
      mainDeclarators: baseline.declarators,
    }
  }
  return {
    extraStatements: [t.variableDeclaration('var', [directCharacters.declarator])],
    mainDeclarators: remaining.declarators,
  }
}
const declarationsFor = (hoisted: Array<HoistedCandidate>, options: HoistPopularConstantsOptions): StringDeclarationPlan => {
  const strings = hoisted.filter(({candidate}) => t.isStringLiteral(candidate.expression))
  const nonStrings = hoisted.filter(({candidate}) => !t.isStringLiteral(candidate.expression))
  const nonStringDeclarators = nonStrings.map(({candidate, identifier}) => t.variableDeclarator(identifier, t.cloneNode(candidate.expression)))
  if (!options.stableBuiltins || !(options.join ?? true) || !strings.length) {
    return {
      extraStatements: [],
      mainDeclarators: hoisted.map(({candidate, identifier}) => t.variableDeclarator(identifier, t.cloneNode(candidate.expression))),
    }
  }
  const stringPlan = optimizeStringDeclarations(strings, Boolean(nonStringDeclarators.length))
  return {
    extraStatements: stringPlan.extraStatements,
    mainDeclarators: [...nonStringDeclarators, ...stringPlan.mainDeclarators],
  }
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
    for (const occurrence of candidate.paths) {
      const parent = occurrence.path.parentPath
      occurrence.path.replaceWith(t.cloneNode(identifier))
      if (occurrence.computedObjectKey && (parent.isObjectProperty() || parent.isObjectMethod())) {
        parent.node.computed = true
      }
    }
    hoisted.push({
      candidate,
      identifier,
    })
  }
  if (!hoisted.length) {
    return false
  }
  const declarationPlan = declarationsFor(hoisted, options)
  const statements: Array<t.Statement> = [...declarationPlan.extraStatements]
  if (declarationPlan.mainDeclarators.length) {
    statements.push(t.variableDeclaration('var', declarationPlan.mainDeclarators))
  }
  path.unshiftContainer('body', statements)
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
