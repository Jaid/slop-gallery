import {afterEach, expect, test} from 'bun:test'

import {readControlled} from '../../src/lib/pauseMenu.ts'

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (storageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
test('blocked control-history storage does not prevent opening the gallery', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked')
    },
  })
  expect(readControlled()).toBe(false)
})
