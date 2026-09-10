import {afterEach, expect, test} from 'bun:test'

import {PauseMenu} from 'use-pause-menu/core'

import {readControlled} from '../../src/lib/pauseMenu.ts'

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (storageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
test('the gallery migrates its legacy control marker without coupling the package to gallery keys', () => {
  const values = new Map([['slop-gallery-controlled', 'true']])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
  const menu = new PauseMenu({
    initialStage: readControlled() ? 'return' : 'first',
    storageKey: 'slop-gallery-visited',
  })
  menu.start()
  expect(menu.getSnapshot().stage).toBe('return')
  expect(values.get('slop-gallery-visited')).toBe('true')
})
test('blocked legacy storage does not prevent opening the gallery', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked')
    },
  })
  expect(readControlled()).toBe(false)
})
