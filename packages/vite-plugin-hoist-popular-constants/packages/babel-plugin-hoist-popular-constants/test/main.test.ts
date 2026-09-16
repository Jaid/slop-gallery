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
  test('respects an explicit savings threshold', () => {
    const source = 'sink("popular-long-string","popular-long-string")'
    expect(compile(source, {minimumSavingsBytes: 100})).not.toContain('var ')
  })
})
