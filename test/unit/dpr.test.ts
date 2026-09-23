import {expect, test} from 'bun:test'

import {dprParser, getDeviceDpr} from '../../src/lib/rendering/dpr.ts'

test('DPR URL values accept finite positive numbers', () => {
  for (const [value, expected] of [['1', 1], ['1.5', 1.5], ['2', 2], ['0.5', 0.5], ['1e1', 10]] as const) {
    expect(dprParser.parse(value)).toBe(expected)
  }
  for (const value of ['', '0', '-1', 'auto', 'NaN', 'Infinity']) {
    expect(dprParser.parse(value)).toBeNull()
  }
  expect(dprParser.serialize(1.5)).toBe('1.5')
})
test('DPR defaults to the device pixel ratio', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio')
  Object.defineProperty(globalThis, 'devicePixelRatio', {
    configurable: true,
    value: 1.75,
  })
  try {
    expect(getDeviceDpr()).toBe(1.75)
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'devicePixelRatio', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'devicePixelRatio')
    }
  }
})
