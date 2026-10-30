import {afterEach, expect, test} from 'bun:test'

import {isHeavyCapable, judgeHeavyCapability, readHeavyCapabilityHints, requestHeavyCapabilityHints} from '../../src/lib/rendering/autoGraphics.ts'

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
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(true)
  stubNavigator({cpuPerformance: 4})
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(true)
  stubNavigator({cpuPerformance: 2})
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(false)
  stubNavigator({
    cpuPerformance: 0,
    deviceMemory: 2,
  })
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(false)
  stubNavigator({
    deviceMemory: 8,
    gpu: stubAdapter('gen-12lp'),
  })
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(false)
  stubNavigator({gpu: stubAdapter(null)})
  expect(isHeavyCapable(await requestHeavyCapabilityHints())).toBe(false)
})
test('detection leaves the GPU family unknown without WebGPU or when the adapter request fails', async () => {
  stubNavigator({deviceMemory: 8})
  delete (navigator as {gpu?: unknown}).gpu
  expect(await requestHeavyCapabilityHints()).toEqual({deviceMemory: 8})
  stubNavigator({gpu: {requestAdapter: () => Promise.reject(new Error('lost'))}})
  expect(await requestHeavyCapabilityHints()).toEqual({deviceMemory: 8})
})
test('each hint is judged on its own, with unreported ones as unknown', () => {
  expect(judgeHeavyCapability({})).toEqual({
    architecture: 'unknown',
    cpuPerformance: 'unknown',
    deviceMemory: 'unknown',
  })
  expect(judgeHeavyCapability({
    architecture: '',
    cpuPerformance: 0,
    deviceMemory: 4,
  })).toEqual({
    architecture: 'unknown',
    cpuPerformance: 'unknown',
    deviceMemory: 'unmet',
  })
  expect(judgeHeavyCapability({
    architecture: 'ampere',
    cpuPerformance: 2,
    deviceMemory: 8,
  })).toEqual({
    architecture: 'unmet',
    cpuPerformance: 'unmet',
    deviceMemory: 'met',
  })
  expect(judgeHeavyCapability({
    architecture: 'rdna-4',
    cpuPerformance: 3,
    deviceMemory: 16,
  })).toEqual({
    architecture: 'met',
    cpuPerformance: 'met',
    deviceMemory: 'met',
  })
})
test('the page requests its hints once', async () => {
  let requests = 0
  stubNavigator({
    deviceMemory: 8,
    gpu: {
      requestAdapter: async () => {
        requests++
        return {info: {architecture: 'lovelace'}}
      },
    },
  })
  const first = readHeavyCapabilityHints()
  expect(readHeavyCapabilityHints()).toBe(first)
  expect(await first).toEqual({
    architecture: 'lovelace',
    deviceMemory: 8,
  })
  expect(requests).toBe(1)
})
