import {expect, test} from 'bun:test'

import {dprParser, getDefaultDpr} from '../../src/lib/rendering/dpr.ts'

test('DPR URL values accept finite positive numbers', () => {
  for (const [value, expected] of [['1', 1], ['1.5', 1.5], ['2', 2], ['0.5', 0.5], ['1e1', 10]] as const) {
    expect(dprParser.parse(value)).toBe(expected)
  }
  for (const value of ['', '0', '-1', 'auto', 'NaN', 'Infinity']) {
    expect(dprParser.parse(value)).toBeNull()
  }
  expect(dprParser.serialize(1.5)).toBe('1.5')
})
test('default DPR is fixed at 1 for performance and device DPR with a 1.5 floor for quality', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio')
  try {
    for (const [deviceDpr, qualityDpr] of [[1, 1.5], [1.25, 1.5], [1.5, 1.5], [1.75, 1.75], [2.5, 2.5]] as const) {
      Object.defineProperty(globalThis, 'devicePixelRatio', {
        configurable: true,
        value: deviceDpr,
      })
      expect(getDefaultDpr(false)).toBe(1)
      expect(getDefaultDpr(true)).toBe(qualityDpr)
    }
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'devicePixelRatio', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'devicePixelRatio')
    }
  }
})
