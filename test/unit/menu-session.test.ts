import {afterEach, expect, test} from 'bun:test'

import {MenuSession, startMenuVisit} from '../../src/lib/gallery/MenuSession.ts'

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (storageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
test('page visits are remembered even without entering or controlling the gallery', () => {
  const values = new Map<string, string>
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
  expect(startMenuVisit()).toBe('first')
  expect(startMenuVisit()).toBe('return')
  values.clear()
  values.set('slop-gallery-controlled', 'true')
  expect(startMenuVisit()).toBe('return')
})
test('blocked storage does not break the menu', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked')
    },
  })
  expect(startMenuVisit()).toBe('first')
})
test.each(['first', 'return'] as const)('%s survives unrelated events and unsuccessful lock requests', stage => {
  const session = new MenuSession(stage)
  session.release('unfocus')
  expect(session.change(false, false, true)).toBe(stage)
  expect(session.change(true, true, true)).toBe(stage)
  session.release('pause')
  expect(session.change(false, true, true)).toBe('pause')
})
test('focused browser unlock works even when Chromium consumes Escape', () => {
  const session = new MenuSession('first')
  session.change(true, true, true)
  expect(session.change(false, true, true)).toBe('pause')
  expect(session.change(false, false, true)).toBe('pause')
})
test('focus loss, hidden tabs and disconnected targets are unfocus, not pause', () => {
  for (const [focused, connected] of [[false, true], [true, false], [false, false]]) {
    const session = new MenuSession('return')
    session.change(true, true, true)
    session.release('pause')
    expect(session.change(false, focused, connected)).toBe('unfocus')
  }
})
test('application releases and blur followed by focus are remembered until unlock', () => {
  const session = new MenuSession('first')
  session.change(true, true, true)
  session.release('unfocus')
  expect(session.change(false, true, true)).toBe('unfocus')
  session.change(true, true, true)
  expect(session.change(false, true, true)).toBe('pause')
})
