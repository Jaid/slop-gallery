import {expect, test} from 'bun:test'

import {readNear} from '../../src/lib/rendering/near.ts'

test('near URL values accept finite positive numbers', () => {
  for (const [value, expected] of [['0.05', 0.05], ['0.01', 0.01], ['1', 1], ['1e-3', 0.001]] as const) {
    expect(readNear(`?near=${value}`)).toBe(expected)
  }
  for (const value of ['', '0', '-0.1', 'auto', 'NaN', 'Infinity']) {
    expect(readNear(`?near=${value}`)).toBeUndefined()
  }
})
