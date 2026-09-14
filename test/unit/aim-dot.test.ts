import {afterEach, expect, test} from 'bun:test'

import aimDot from '../../src/lib/aimDot.ts'
import {cameraPose, setCameraFocused} from '../../src/lib/gallery/actions.ts'

afterEach(() => {
  setCameraFocused(false)
  aimDot.setBlocked('zoom', false)
})
test('aim dot suppression composes independent viewing and zoom reasons', () => {
  expect(aimDot.getSnapshot()).toBe(true)
  aimDot.setBlocked('viewing', true)
  expect(aimDot.getSnapshot()).toBe(false)
  aimDot.setBlocked('zoom', true)
  aimDot.setBlocked('viewing', false)
  expect(aimDot.getSnapshot()).toBe(false)
  aimDot.setBlocked('zoom', false)
  expect(aimDot.getSnapshot()).toBe(true)
})
test('aim dot publishes only when effective visibility changes', () => {
  let updates = 0
  const unsubscribe = aimDot.subscribe(() => updates++)
  aimDot.setBlocked('viewing', true)
  aimDot.setBlocked('zoom', true)
  aimDot.setBlocked('viewing', false)
  aimDot.setBlocked('zoom', false)
  unsubscribe()
  expect(updates).toBe(2)
})
test('camera focus suppresses the aim dot for the full viewing lifecycle', () => {
  setCameraFocused(true)
  expect(cameraPose.focused).toBe(true)
  expect(aimDot.getSnapshot()).toBe(false)
  setCameraFocused(false)
  expect(cameraPose.focused).toBe(false)
  expect(aimDot.getSnapshot()).toBe(true)
})
