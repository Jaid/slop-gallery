import type {NodePath, PluginPass} from '@babel/core'

import {Buffer} from 'node:buffer'

import {types as t} from '@babel/core'
import {declare} from '@babel/helper-plugin-utils'
import sortShortestLevenshtein from 'sort-shortest-levenshtein'

export type HoistPopularConstantsOptions = {
  /** Estimate savings against the output of a following minifier (e.g. `true` as `!0`, `1000000` as `1e6`, `{"a":1}` as `{a:1}`) instead of the source as written. Defaults to false. */
  estimateMinifiedSize?: boolean
  /** Pack pooled strings into compact destructuring initializers when smaller. Defaults to true and requires stableBuiltins. */
  join?: boolean
  minimumOccurrences?: number
  minimumSavingsBytes?: number
  /** Pool non-computed property names (`a.foo` → `a[_]`, `{foo:1}` → `{[_]:1}`) together with equal string literals. Defaults to true. */
  propertyNames?: boolean
  /** Also transform scripts, where the hoisted top-level `var` becomes a property of the global object. Defaults to false, leaving scripts untouched. */
  scriptGlobals?: boolean
  /** Assume unbound built-in objects are stable, enabling constants such as Math.PI and `this`-free static functions such as Math.floor and Object.keys to be pooled. */
  stableBuiltins?: boolean
}

type PopularLiteral = t.BigIntLiteral | t.BooleanLiteral | t.NullLiteral | t.NumericLiteral | t.StringLiteral
type PopularLiteralPath = NodePath<t.BigIntLiteral> | NodePath<t.BooleanLiteral> | NodePath<t.NullLiteral> | NodePath<t.NumericLiteral> | NodePath<t.StringLiteral>
type CandidateExpression = PopularLiteral | t.MemberExpression
type KeyOwner = t.ClassMethod | t.ClassProperty | t.ObjectMethod | t.ObjectProperty
type CandidateOccurrence = {
  /** Replace the key of a property, method or class member and mark it computed. */
  kind: 'key'
  owner: KeyOwner
} | {
  /** Replace the property of a member expression and mark it computed. */
  kind: 'property'
  owner: t.MemberExpression | t.OptionalMemberExpression
} | {
  kind: 'value'
  path: NodePath<t.MemberExpression> | PopularLiteralPath
}
type Occurrence = {
  /** Bytes other than the identifier that the replacement adds. */
  overheadBytes: number
  /** Bytes the replacement removes. */
  rawBytes: number
  target: CandidateOccurrence
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
/** Constants and static functions that do not depend on `this`, so they stay correct when read once and called unbound. Limited to ES2017 so polyfills installed after module evaluation are not missed. */
const stableBuiltinMembers = new Map([
  ['Array', new Set([
    'from',
    'isArray',
    'of',
  ])],
  ['JSON', new Set([
    'parse',
    'stringify',
  ])],
  ['Math', new Set([
    'E',
    'LN10',
    'LN2',
    'LOG10E',
    'LOG2E',
    'PI',
    'SQRT1_2',
    'SQRT2',
    'abs',
    'acos',
    'acosh',
    'asin',
    'asinh',
    'atan',
    'atan2',
    'atanh',
    'cbrt',
    'ceil',
    'clz32',
    'cos',
    'cosh',
    'exp',
    'expm1',
    'floor',
    'fround',
    'hypot',
    'imul',
    'log',
    'log10',
    'log1p',
    'log2',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sign',
    'sin',
    'sinh',
    'sqrt',
    'tan',
    'tanh',
    'trunc',
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
    'isFinite',
    'isInteger',
    'isNaN',
    'isSafeInteger',
    'parseFloat',
    'parseInt',
  ])],
  ['Object', new Set([
    'assign',
    'create',
    'defineProperties',
    'defineProperty',
    'entries',
    'freeze',
    'getOwnPropertyDescriptor',
    'getOwnPropertyDescriptors',
    'getOwnPropertyNames',
    'getOwnPropertySymbols',
    'getPrototypeOf',
    'is',
    'isExtensible',
    'isFrozen',
    'isSealed',
    'keys',
    'preventExtensions',
    'seal',
    'setPrototypeOf',
    'values',
  ])],
  ['Reflect', new Set([
    'apply',
    'construct',
    'defineProperty',
    'deleteProperty',
    'get',
    'getOwnPropertyDescriptor',
    'getPrototypeOf',
    'has',
    'isExtensible',
    'ownKeys',
    'preventExtensions',
    'set',
    'setPrototypeOf',
  ])],
  ['String', new Set([
    'fromCharCode',
    'fromCodePoint',
    'raw',
  ])],
  ['Symbol', new Set([
    'asyncIterator',
    'for',
    'hasInstance',
    'isConcatSpreadable',
    'iterator',
    'keyFor',
    'match',
    'replace',
    'search',
    'species',
    'split',
    'toPrimitive',
    'toStringTag',
    'unscopables',
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
/** Size with the quote style that needs fewer escapes, as chosen by minifiers. */
const minifiedStringBytes = (value: string) => {
  let doubleQuotes = 0
  let singleQuotes = 0
  for (const character of value) {
    if (character === '"') {
      doubleQuotes++
    } else if (character === "'") {
      singleQuotes++
    }
  }
  return generatedStringBytes(value) - doubleQuotes + Math.min(doubleQuotes, singleQuotes)
}
const minifiedNumberBytes = (value: number) => {
  if (!Number.isFinite(value)) {
    return 3
  }
  const text = String(value).replace(/^0\./u, '.').replace('e+', 'e')
  const representations = [text]
  const trailingZeros = /^(\d+?)(0+)$/u.exec(text)
  if (trailingZeros) {
    representations.push(`${trailingZeros[1]}e${trailingZeros[2].length}`)
  }
  const fraction = /^\.(0*)(\d+)$/u.exec(text)
  if (fraction) {
    representations.push(`${fraction[2]}e-${fraction[1].length + fraction[2].length}`)
  }
  if (Number.isSafeInteger(value)) {
    representations.push(`0x${value.toString(16)}`)
  }
  return Math.min(...representations.map(representation => representation.length))
}
const minifiedLiteralBytes = (node: PopularLiteral) => {
  if (t.isStringLiteral(node)) {
    return minifiedStringBytes(node.value)
  }
  if (t.isNumericLiteral(node)) {
    return minifiedNumberBytes(node.value)
  }
  if (t.isBooleanLiteral(node)) {
    return 2
  }
  return Buffer.byteLength(literalRaw(node))
}
const literalBytes = (node: PopularLiteral, options: HoistPopularConstantsOptions) => options.estimateMinifiedSize ? minifiedLiteralBytes(node) : Buffer.byteLength(literalRaw(node))
/** Strings compared against `typeof` or other strings let minifiers loosen `===` to `==`, which a pooled identifier prevents. */
const isLooseningComparison = (path: PopularLiteralPath) => {
  const parent = path.parentPath
  if (!parent.isBinaryExpression() || !['!==', '==='].includes(parent.node.operator)) {
    return false
  }
  const other = path.key === 'left' ? parent.node.right : parent.node.left
  return t.isUnaryExpression(other, {operator: 'typeof'}) || t.isStringLiteral(other)
}
const valueOccurrence = (path: PopularLiteralPath, rawBytes: number, overheadBytes = 0): Occurrence => ({
  overheadBytes,
  rawBytes,
  target: {
    kind: 'value',
    path,
  },
})
const literalOccurrence = (path: PopularLiteralPath, options: HoistPopularConstantsOptions): Occurrence => {
  const {node} = path
  const parent = path.parentPath
  if (isObjectLiteralKey(path)) {
    // Minifiers unquote `{"foo":1}` to `{foo:1}`.
    const rawBytes = options.estimateMinifiedSize && t.isStringLiteral(node) && t.isValidIdentifier(node.value, false)
      ? Buffer.byteLength(node.value)
      : literalBytes(node, options)
    return {
      overheadBytes: 2,
      rawBytes,
      target: {
        kind: 'key',
        owner: parent.node as t.ObjectMethod | t.ObjectProperty,
      },
    }
  }
  if (!options.estimateMinifiedSize || !t.isStringLiteral(node)) {
    return valueOccurrence(path, literalBytes(node, options))
  }
  // Minifiers rewrite `a["foo"]` to `a.foo`, so pooling really trades `.foo` for `[_]`.
  if ((parent.isMemberExpression() || parent.isOptionalMemberExpression()) && path.key === 'property' && t.isValidIdentifier(node.value, false)) {
    return valueOccurrence(path, Buffer.byteLength(node.value) + (parent.isMemberExpression() ? 1 : 0), 2)
  }
  return valueOccurrence(path, minifiedStringBytes(node.value), isLooseningComparison(path) ? 1 : 0)
}
const addCandidate = (state: HoistPluginState, key: string, occurrence: Occurrence, expression: CandidateExpression, expressionBytes: number) => {
  const candidates = state.candidates!
  const candidate = candidates.get(key)
  if (candidate) {
    candidate.occurrences++
    candidate.paths.push(occurrence.target)
    candidate.rawBytes += occurrence.rawBytes
    candidate.replacementOverheadBytes += occurrence.overheadBytes
    if (expressionBytes < candidate.expressionBytes) {
      candidate.expression = t.cloneNode(expression)
      candidate.expressionBytes = expressionBytes
    }
    return
  }
  candidates.set(key, {
    expression: t.cloneNode(expression),
    expressionBytes,
    occurrences: 1,
    paths: [occurrence.target],
    rawBytes: occurrence.rawBytes,
    replacementOverheadBytes: occurrence.overheadBytes,
  })
}
const addLiteralCandidate = (path: PopularLiteralPath, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  if (!isHoistable(path)) {
    return
  }
  addCandidate(state, literalKey(path.node), literalOccurrence(path, options), path.node, literalBytes(path.node, options))
}
const addPropertyNameCandidate = (state: HoistPluginState, name: string, occurrence: Occurrence, options: HoistPopularConstantsOptions) => {
  const expression = t.stringLiteral(name)
  addCandidate(state, `string:${name}`, occurrence, expression, literalBytes(expression, options))
}
const addStableBuiltinCandidate = (path: NodePath<t.MemberExpression>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  if (!options.stableBuiltins || path.node.computed || !isStableBuiltinRead(path)) {
    return false
  }
  if (!t.isIdentifier(path.node.object) || path.scope.getBinding(path.node.object.name)) {
    return false
  }
  const members = stableBuiltinMembers.get(path.node.object.name)
  if (!members || !t.isIdentifier(path.node.property) || !members.has(path.node.property.name)) {
    return false
  }
  const raw = `${path.node.object.name}.${path.node.property.name}`
  const bytes = Buffer.byteLength(raw)
  addCandidate(state, `builtin:${raw}`, {
    overheadBytes: 0,
    rawBytes: bytes,
    target: {
      kind: 'value',
      path,
    },
  }, path.node, bytes)
  return true
}
const addMemberPropertyCandidate = (path: NodePath<t.MemberExpression | t.OptionalMemberExpression>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  const {node} = path
  if (node.computed || !t.isIdentifier(node.property)) {
    return
  }
  // `.foo` becomes `[_]` and `?.foo` becomes `?.[_]`.
  addPropertyNameCandidate(state, node.property.name, {
    overheadBytes: 2,
    rawBytes: Buffer.byteLength(node.property.name) + (t.isMemberExpression(node) ? 1 : 0),
    target: {
      kind: 'property',
      owner: node,
    },
  }, options)
}
const addKeyCandidate = (path: NodePath<KeyOwner>, state: HoistPluginState, options: HoistPopularConstantsOptions) => {
  const {node} = path
  if (node.computed || !t.isIdentifier(node.key) || node.key.name === '__proto__' || t.isObjectProperty(node) && node.shorthand) {
    return
  }
  // A computed "constructor" key declares an ordinary method instead of the class constructor.
  if ((t.isClassMethod(node) || t.isClassProperty(node)) && node.key.name === 'constructor') {
    return
  }
  addPropertyNameCandidate(state, node.key.name, {
    overheadBytes: 2,
    rawBytes: Buffer.byteLength(node.key.name),
    target: {
      kind: 'key',
      owner: node,
    },
  }, options)
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
  if (state.hasDirectEval || path.node.sourceType !== 'module' && !options.scriptGlobals) {
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
      if (occurrence.kind === 'key') {
        occurrence.owner.key = t.cloneNode(identifier)
        occurrence.owner.computed = true
      } else if (occurrence.kind === 'property') {
        occurrence.owner.property = t.cloneNode(identifier)
        occurrence.owner.computed = true
      } else {
        occurrence.path.replaceWith(t.cloneNode(identifier))
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
  const propertyNames = options.propertyNames ?? true
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
        addLiteralCandidate(path, state, options)
      },
      BooleanLiteral(path, state) {
        addLiteralCandidate(path, state, options)
      },
      'ClassMethod|ClassProperty|ObjectMethod|ObjectProperty'(path, state) {
        if (propertyNames) {
          addKeyCandidate(path as NodePath<KeyOwner>, state, options)
        }
      },
      MemberExpression(path, state) {
        if (!addStableBuiltinCandidate(path, state, options) && propertyNames) {
          addMemberPropertyCandidate(path, state, options)
        }
      },
      NullLiteral(path, state) {
        addLiteralCandidate(path, state, options)
      },
      NumericLiteral(path, state) {
        addLiteralCandidate(path, state, options)
      },
      OptionalMemberExpression(path, state) {
        if (propertyNames) {
          addMemberPropertyCandidate(path, state, options)
        }
      },
      StringLiteral(path, state) {
        addLiteralCandidate(path, state, options)
      },
    },
  }
})
