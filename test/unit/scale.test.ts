import {expect, test} from 'bun:test'

import {readScale} from '../../src/lib/rendering/scale.ts'

test('scale URL values accept finite positive numbers', () => {
  for (const [value, expected] of [['1', 1], ['1.5', 1.5], ['2', 2], ['0.5', 0.5], ['1e1', 10]] as const) {
    expect(readScale(`?scale=${value}`)).toBe(expected)
  }
  for (const value of ['', '0', '-1', 'auto', 'NaN', 'Infinity']) {
    expect(readScale(`?scale=${value}`)).toBeUndefined()
  }
})
test('the former dpr URL name is not accepted', () => {
  expect(readScale('?dpr=2')).toBeUndefined()
})
