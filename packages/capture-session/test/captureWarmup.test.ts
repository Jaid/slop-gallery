import {describe, expect, test} from 'bun:test'

import CaptureWarmup from '../src/CaptureWarmup.ts'

describe('capture warmup', () => {
  test('renders at the smaller of the warmup and the regular scale until it ends, then at the regular one', () => {
    const warmup = new CaptureWarmup({warmupScale: 0.25})
    expect(warmup.active).toBe(true)
    expect(warmup.scale(1)).toBe(0.25)
    expect(warmup.scale(2)).toBe(0.25)
    expect(warmup.scale(0.1)).toBe(0.1)
    expect(warmup.end()).toBe(true)
    expect(warmup.active).toBe(false)
    expect(warmup.scale(2)).toBe(2)
    expect(warmup.end()).toBe(false)
  })
  test('without a warmup scale it never warms up', () => {
    const warmup = new CaptureWarmup
    expect(warmup.active).toBe(false)
    expect(warmup.scale(1.5)).toBe(1.5)
    expect(warmup.end()).toBe(false)
  })
  test('tells its subscribers once when it ends, as an external store', () => {
    const warmup = new CaptureWarmup({warmupScale: 0.5})
    let calls = 0
    const unsubscribe = warmup.subscribe(() => calls++)
    expect(warmup.getSnapshot()).toBe(true)
    warmup.end()
    warmup.end()
    expect(calls).toBe(1)
    expect(warmup.getSnapshot()).toBe(false)
    unsubscribe()
  })
  test('rejects scales that are not positive', () => {
    for (const warmupScale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new CaptureWarmup({warmupScale})).toThrow(RangeError)
    }
  })
})
