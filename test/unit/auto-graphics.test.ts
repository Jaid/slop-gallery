import {afterEach, expect, test} from 'bun:test'

import {detectHeavyCapability, isHeavyCapable} from '../../src/lib/rendering/autoGraphics.ts'

const stubbed = ['cpuPerformance', 'deviceMemory', 'gpu'] as const
const descriptors = Object.fromEntries(stubbed.map(key => [key, Object.getOwnPropertyDescriptor(navigator, key)]))
const stubNavigator = (values: Partial<Record<typeof stubbed[number], unknown>>) => {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, {
      configurable: true,
      value,
    })
  }
}
const stubAdapter = (architecture: string | null) => ({
  requestAdapter: async () => (architecture === null ? null : {info: {architecture}}),
})
afterEach(() => {
  for (const key of stubbed) {
    const descriptor = descriptors[key]
    if (descriptor) {
      Object.defineProperty(navigator, key, descriptor)
    } else {
      delete (navigator as Partial<Record<typeof stubbed[number], unknown>>)[key]
    }
  }
})
test('heavy needs both a trusted GPU family and at least 8 gigabytes of device memory', () => {
  for (const architecture of ['lovelace', 'blackwell', 'rdna-4']) {
    expect(isHeavyCapable({
      architecture,
      deviceMemory: 8,
    })).toBe(true)
    expect(isHeavyCapable({
      architecture,
      deviceMemory: 32,
    })).toBe(true)
    expect(isHeavyCapable({
      architecture,
      deviceMemory: 4,
    })).toBe(false)
    expect(isHeavyCapable({architecture})).toBe(false)
  }
  for (const architecture of ['ampere', 'rdna-3', 'xe-2-hpg', 'metal-3', 'gen-12lp', 'swiftshader', 'Lovelace', '', undefined]) {
    expect(isHeavyCapable({
      architecture,
      deviceMemory: 8,
    })).toBe(false)
  }
})
test('CPU performance tiers 1 and 2 keep a trusted GPU from heavy, while unknown or missing tiers don’t', () => {
  for (const cpuPerformance of [1, 2]) {
    expect(isHeavyCapable({
      architecture: 'lovelace',
      cpuPerformance,
      deviceMemory: 8,
    })).toBe(false)
  }
  for (const cpuPerformance of [0, 3, 4, 5, undefined]) {
    expect(isHeavyCapable({
      architecture: 'lovelace',
      cpuPerformance,
      deviceMemory: 8,
    })).toBe(true)
  }
  expect(isHeavyCapable({
    architecture: 'ampere',
    cpuPerformance: 4,
    deviceMemory: 8,
  })).toBe(false)
})
test('detection asks the WebGPU adapter and the navigator', async () => {
  stubNavigator({
    deviceMemory: 8,
    gpu: stubAdapter('lovelace'),
  })
  expect(await detectHeavyCapability()).toBe(true)
  stubNavigator({cpuPerformance: 4})
  expect(await detectHeavyCapability()).toBe(true)
  stubNavigator({cpuPerformance: 2})
  expect(await detectHeavyCapability()).toBe(false)
  stubNavigator({
    cpuPerformance: 0,
    deviceMemory: 2,
  })
  expect(await detectHeavyCapability()).toBe(false)
  stubNavigator({
    deviceMemory: 8,
    gpu: stubAdapter('gen-12lp'),
  })
  expect(await detectHeavyCapability()).toBe(false)
  stubNavigator({gpu: stubAdapter(null)})
  expect(await detectHeavyCapability()).toBe(false)
})
test('detection gives fast without WebGPU', async () => {
  stubNavigator({deviceMemory: 8})
  delete (navigator as {gpu?: unknown}).gpu
  expect(await detectHeavyCapability()).toBe(false)
})
