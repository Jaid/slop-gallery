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
    const values = ['eeeeeeeee', 'éé', 'dddddddd', 'xx', 'ccccccc', 'aaa', 'bbbbbb', 'fffff']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })
    expect(code).toContain('"xx aaa éé fffff bbbbbb ccccccc dddddddd eeeeeeeee".split(" ")')
  })
  test('chains equal-byte joined strings by Levenshtein distance', () => {
    const values = ['zzz', 'abc', 'axx', 'aa', 'bbbb', 'cccc', 'dddd', 'eeee']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })
    expect(code).toContain('"aa abc axx zzz bbbb cccc dddd eeee".split(" ")')
  })
  test('packs one-code-point strings through direct string iteration when shorter', () => {
    const values = ['a', 'b', 'é', '😀']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })
    expect(code).toContain('="abé😀";')
    expect(code).not.toContain('.split(')
  })
  test('keeps single characters in the split pool when extracting them would be longer', () => {
    const values = ['a', 'b', 'marcus', 'jack', 'thomas', 'friedrich', 'sandra', 'paula']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    const code = compile(source, {
      minimumSavingsBytes: -100,
      stableBuiltins: true,
    })
    expect(code).toContain('.split(" ")')
    expect(code).not.toContain('="ab";')
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
  test('uses the first available escape-free join separator', () => {
    const values = ['marcus smith', 'jack black', 'thomas brown', 'linda white', 'paula green', 'bernd gray', 'friedrich gold', 'sandra blue']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).toContain('.split("_")')
  })
  test('skips a higher-priority quote separator when it would require escaping', () => {
    const values = [' _-marcus', ' _-jackson', ' _-thomas', ' _-lindsey', ' _-paulina', ' _-bernhard', ' _-friedrich', ' _-sandra']
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).toContain('.split("\'")')
  })
  test('skips backslash as a separator because it would require escaping', () => {
    const blocked = " _-\"',.`|:;!#$%&([{)]}/"
    const values = ['marcus', 'jackson', 'thomas', 'lindsey', 'paulina', 'bernhard', 'friedrich', 'sandra'].map(value => blocked + value)
    const source = `sink(${values.flatMap(value => Array.from({length: 3}, () => JSON.stringify(value))).join(',')})`
    expect(compile(source, {stableBuiltins: true})).toContain('.split("*")')
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
  test('leaves module specifiers literal while hoisting profitable object keys', () => {
    const code = compile(`
      import x from "popular-long-string"
      export {x} from "popular-long-string"
      const one = {"popular-long-string": 1}
      const two = {"popular-long-string": 2}
    `)
    expect(code).toStartWith('var _="popular-long-string";')
    expect(code).toContain('const one={[_]:1}')
    expect(code).toContain('const two={[_]:2}')
    expect(code.match(/popular-long-string/gu)).toHaveLength(3)
  })
  test('accounts for computed-key brackets when deciding whether to hoist', () => {
    const code = compile('sink({"abc":1},{"abc":2})')
    expect(code).not.toContain('var ')
    expect(code.match(/"abc"/gu)).toHaveLength(2)
  })
  test('hoists repeated object method keys as computed keys', () => {
    const code = compile('sink({"popular-long-method"(){return 1}},{"popular-long-method"(){return 2}})')
    expect(code).toStartWith('var _="popular-long-method";')
    expect(code.match(/\[_\]\(\)/gu)).toHaveLength(2)
  })
  test('does not compute __proto__ object literal keys', () => {
    const code = compile('sink({"__proto__":null},{"__proto__":null})', {
      minimumSavingsBytes: -100,
    })
    expect(code.match(/"__proto__"/gu)).toHaveLength(2)
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
      propertyNames: false,
      stableBuiltins: true,
    })).not.toContain('var ')
  })
  test('pools stable built-in functions when enabled', () => {
    const code = compile('Math.floor(a);Math.floor(b);Math.floor(c);Object.keys(a);Object.keys(b);Object.keys(c)', {stableBuiltins: true})
    expect(code.match(/Math\.floor/gu)).toHaveLength(1)
    expect(code.match(/Object\.keys/gu)).toHaveLength(1)
  })
  test('does not pool built-in functions that depend on their receiver', () => {
    const code = compile('Promise.resolve(a);Promise.resolve(b);Promise.resolve(c)', {
      propertyNames: false,
      stableBuiltins: true,
    })
    expect(code).not.toContain('var ')
  })
  test('pools member property names together with equal string literals', () => {
    const code = compile('a.addEventListener(1);b.addEventListener(2);c?.addEventListener(3);sink("addEventListener")')
    expect(code).toStartWith('var _="addEventListener";')
    expect(code).toContain('a[_](1);b[_](2);c?.[_](3);sink(_)')
  })
  test('pools identifier keys of objects, patterns and class members as computed keys', () => {
    const code = compile('sink({popularKey:1},{popularKey(){}},{popularKey:a}={});class A{constructor(){}popularKey(){}static popularKey=1}')
    expect(code).toStartWith('var _="popularKey";')
    expect(code).toContain('sink({[_]:1},{[_](){}},{[_]:a}={})')
    expect(code).toContain('class A{constructor(){}[_](){}static[_]=1}')
  })
  test('never computes class constructors, shorthand properties or __proto__ keys', () => {
    const code = compile('class A{constructor(){}}class B{constructor(){}}class C{constructor(){}};sink({popularKey},{popularKey},{__proto__:a},{__proto__:b})', {
      minimumSavingsBytes: -100,
    })
    expect(code.match(/constructor\(\)/gu)).toHaveLength(3)
    expect(code.match(/\{popularKey\}/gu)).toHaveLength(2)
    expect(code.match(/__proto__:/gu)).toHaveLength(2)
  })
  test('can disable property name pooling', () => {
    const code = compile('a.addEventListener(1);b.addEventListener(2);c.addEventListener(3)', {propertyNames: false})
    expect(code).not.toContain('var ')
  })
  test('estimates booleans and numbers at their minified size when enabled', () => {
    expect(compile('sink(true,true,true,true)')).toStartWith('var _=true;')
    expect(compile('sink(true,true,true,true)', {estimateMinifiedSize: true})).not.toContain('var ')
    expect(compile('sink(1000000,1000000,1000000)')).toStartWith('var _=1000000;')
    expect(compile('sink(1000000,1000000,1000000)', {estimateMinifiedSize: true})).not.toContain('var ')
  })
  test('estimates quoted keys and computed members at their unquoted minified size', () => {
    const source = 'sink({"abcd":1},{"abcd":2},{"abcd":3},a["abcd"],b["abcd"])'
    expect(compile(source, {minimumSavingsBytes: 3})).toStartWith('var _="abcd";')
    expect(compile(source, {
      estimateMinifiedSize: true,
      minimumSavingsBytes: 3,
    })).not.toContain('var ')
  })
  test('charges a byte for strict typeof comparisons a minifier would loosen', () => {
    const source = 'typeof a==="abcd";typeof b==="abcd";typeof c==="abcd";typeof d==="abcd"'
    expect(compile(source, {minimumSavingsBytes: 6})).toStartWith('var _="abcd";')
    expect(compile(source, {
      estimateMinifiedSize: true,
      minimumSavingsBytes: 6,
    })).not.toContain('var ')
  })
  test('leaves scripts untouched unless script globals are allowed', () => {
    const source = 'sink("popular-long-string","popular-long-string")'
    const compileScript = (options: HoistPopularConstantsOptions) => transformSync(source, {
      babelrc: false,
      compact: true,
      configFile: false,
      minified: true,
      parserOpts: {sourceType: 'script'},
      plugins: [[hoistPopularConstants, options]],
    })?.code ?? ''
    expect(compileScript({})).toBe(`${source};`)
    expect(compileScript({scriptGlobals: true})).toStartWith('var _="popular-long-string";')
  })
  test('respects an explicit savings threshold', () => {
    const source = 'sink("popular-long-string","popular-long-string")'
    expect(compile(source, {minimumSavingsBytes: 100})).not.toContain('var ')
  })
})
