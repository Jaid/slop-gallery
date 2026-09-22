import {describe, expect, test} from 'bun:test'

import {transformSync} from '@babel/core'

import hoistPopularConstants from '../src/main.ts'

type HoistPopularConstantsOptions = Parameters<typeof hoistPopularConstants>[1]
const compile = (source: string, options: HoistPopularConstantsOptions = {}) => transformSync(source, {
  babelrc: false,
  compact: true,
  configFile: false,
  minified: true,
  plugins: [[hoistPopularConstants, options]],
})?.code ?? ''
describe('popular constant hoisting', () => {
  test('hoists an empty string once it saves bytes', () => {
    const code = compile(`sink(${Array.from({length: 10}, () => "''").join(',')})`)
    expect(code).toStartWith('var _="";')
    expect(code.match(/""/gu)).toHaveLength(1)
    expect(code.match(/\b_\b/gu)?.length).toBe(11)
  })
  test('uses UTF-8 byte size for non-ASCII literals', () => {
    const code = compile('sink("😀","😀","😀")')
    expect(code).toStartWith('var _="😀";')
  })
  test('pools profitable strings and numbers into one declaration', () => {
    const code = compile('sink("popular-long-string","popular-long-string",4294967295,4294967295,4294967295)')
    expect(code).toStartWith('var ')
    expect(code.match(/popular-long-string/gu)).toHaveLength(1)
    expect(code.match(/4294967295/gu)).toHaveLength(1)
    expect(code.match(/\bvar\b/gu)).toHaveLength(1)
  })
  test('joins eight pooled strings when split-backed destructuring saves a byte', () => {
    const values = ['marcus', 'jack', 'thomas', 'linda', 'paula', 'bernd', 'friedrich', 'sandra']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {stableBuiltins: true})
    expect(code).toContain('.split(" ")')
    expect(code).toStartWith('var[')
  })
  test('sorts joined strings by UTF-8 byte length', () => {
    const values = ['eeeeeeee', 'éé', 'ddddddd', 'x', 'cccccc', 'aaa', 'bbbbb', 'yy']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })
    expect(code).toContain('"x yy aaa éé bbbbb cccccc ddddddd eeeeeeee".split(" ")')
  })
  test('does not join seven pooled strings when destructuring would not save bytes', () => {
    const values = ['marcus', 'jack', 'thomas', 'linda', 'paula', 'bernd', 'friedrich']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).not.toContain('.split(')
  })
  test('can disable joined string pooling explicitly', () => {
    const values = ['marcus', 'jack', 'thomas', 'linda', 'paula', 'bernd', 'friedrich', 'sandra']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {
      join: false,
      stableBuiltins: true,
    })).not.toContain('.split(')
  })
  test('disables joined string pooling when stable built-ins are disabled', () => {
    const values = ['marcus', 'jack', 'thomas', 'linda', 'paula', 'bernd', 'friedrich', 'sandra']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {
      join: true,
      stableBuiltins: false,
    })).not.toContain('.split(')
  })
  test('uses the first available one-byte join separator', () => {
    const values = ['marcus smith', 'jack black', 'thomas brown', 'linda white', 'paula green', 'bernd gray', 'friedrich gold', 'sandra blue']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).toContain('.split("_")')
  })
  test('falls back when every join separator occurs in the pooled strings', () => {
    const printableAscii = Array.from({length: 95}, (_, index) => String.fromCodePoint(32 + index)).join('')
    const values = [printableAscii, 'marcus', 'jackson', 'thomas', 'lindsey', 'paulina', 'bernhard', 'friedrich']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).not.toContain('.split(')
  })
  test('hoists other primitive literals without identity', () => {
    const code = compile('sink(null,null,null,null,null,true,true,true,true,true,12345678901234567890n,12345678901234567890n)')
    expect(code.match(/null/gu)).toHaveLength(1)
    expect(code.match(/true/gu)).toHaveLength(1)
    expect(code.match(/12345678901234567890n/gu)).toHaveLength(1)
  })
  test('does not hoist object-like values with identity', () => {
    const code = compile('sink({},{},[],[],/x/,/x/)')
    expect(code).not.toContain('var ')
  })
  test('leaves module specifiers and non-computed property keys literal', () => {
    const code = compile(`
      import x from "popular-long-string"
      export {x} from "popular-long-string"
      const one = {"popular-long-string": 1}
      const two = {"popular-long-string": 2}
    `)
    expect(code).not.toContain('var ')
    expect(code.match(/popular-long-string/gu)).toHaveLength(4)
  })
  test('skips programs with direct eval because added bindings are observable', () => {
    const code = compile('eval("typeof _");sink("popular-long-string","popular-long-string")')
    expect(code).not.toContain('var ')
  })
  test('does not turn delete literals into identifier deletes', () => {
    const code = compile('sink(delete "popular-long-string",delete "popular-long-string")')
    expect(code).not.toContain('var ')
  })
  test('does not shadow existing top-level bindings', () => {
    const code = compile('const a=0;sink("popular-long-string","popular-long-string")')
    expect(code).toStartWith('var _="popular-long-string";')
  })
  test('keeps built-in constants opt-in', () => {
    const code = compile('sink(Math.PI,Math.PI,Math.PI,Math.PI)')
    expect(code).not.toContain('var ')
    expect(code.match(/Math\.PI/gu)).toHaveLength(4)
  })
  test('pools stable Math and Number constants when enabled', () => {
    const mathNames = ['E', 'LN10', 'LN2', 'LOG10E', 'LOG2E', 'PI', 'SQRT1_2', 'SQRT2']
    const numberNames = ['EPSILON', 'MAX_SAFE_INTEGER', 'MAX_VALUE', 'MIN_SAFE_INTEGER', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']
    const values = [
      ...mathNames.flatMap(name => Array.from({length: 3}, () => `Math.${name}`)),
      ...numberNames.flatMap(name => Array.from({length: 3}, () => `Number.${name}`)),
    ].join(',')
    const code = compile(`sink(${values})`, {stableBuiltins: true})
    for (const name of mathNames) {
      expect(code.split(`Math.${name}`)).toHaveLength(2)
    }
    for (const name of numberNames) {
      expect(code.split(`Number.${name}`)).toHaveLength(2)
    }
    expect(code.match(/\bvar\b/gu)).toHaveLength(1)
  })
  test('does not treat shadowed built-in objects as stable', () => {
    const code = compile('function f(Math,Number){sink(Math.PI,Math.PI,Math.PI,Math.PI,Number.NaN,Number.NaN,Number.NaN)}', {stableBuiltins: true})
    expect(code).not.toContain('var _=')
    expect(code.match(/Math\.PI/gu)).toHaveLength(4)
    expect(code.match(/Number\.NaN/gu)).toHaveLength(3)
  })
  test('does not hoist built-in constants used as mutation targets', () => {
    const source = 'Math.PI++;delete Math.PI;for(Math.PI in source){};({value:Number.NaN}=source)'
    expect(compile(source, {
      minimumOccurrences: 1,
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })).not.toContain('var ')
  })
  test('respects an explicit savings threshold', () => {
    const source = 'sink("popular-long-string","popular-long-string")'
    expect(compile(source, {minimumSavingsBytes: 100})).not.toContain('var ')
  })
})
