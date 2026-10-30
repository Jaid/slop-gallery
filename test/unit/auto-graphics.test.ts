import {afterEach, expect, test} from 'bun:test'

import {detectHeavyCapability, isHeavyCapable} from '../../src/lib/rendering/autoGraphics.ts'

const stubbed = ['deviceMemory', 'gpu'] as const
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
    expect(isHeavyCapable(architecture, 8)).toBe(true)
    expect(isHeavyCapable(architecture, 4)).toBe(false)
    expect(isHeavyCapable(architecture, undefined)).toBe(false)
  }
  for (const architecture of ['ampere', 'rdna-3', 'xe-2-hpg', 'metal-3', 'gen-12lp', 'swiftshader', 'Lovelace', '', undefined]) {
    expect(isHeavyCapable(architecture, 8)).toBe(false)
  }
})
test('detection asks the WebGPU adapter and falls back to fast without one', async () => {
  stubNavigator({
    deviceMemory: 8,
    gpu: stubAdapter('lovelace'),
  })
  expect(await detectHeavyCapability()).toBe(true)
  stubNavigator({deviceMemory: 2})
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
