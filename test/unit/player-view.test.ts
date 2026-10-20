import {afterEach, expect, test} from 'bun:test'

import aimDot from '../../src/lib/aimDot.ts'
import interactionHint from '../../src/lib/interactionHint.ts'
import {getInspectionFocus, getInspectionFocusBlur, getInspectionFocusDistance, getInspectionFocusProximity, setInspectionFocus, setPlayerZoom} from '../../src/lib/rendering/playerView.ts'

afterEach(() => {
  setInspectionFocus(0, 1, 0)
  setPlayerZoom(0)
  interactionHint.update(null, 0, true)
})
test('Knot focus clamps blur amount and proximity and retains only valid positive focus distances', () => {
  setInspectionFocus(2, 4.5, 2)
  expect(getInspectionFocus()).toBe(1)
  expect(getInspectionFocusDistance()).toBe(4.5)
  expect(getInspectionFocusProximity()).toBe(1)
  setInspectionFocus(-2, Number.NaN, -2)
  expect(getInspectionFocus()).toBe(0)
  expect(getInspectionFocusDistance()).toBe(4.5)
  expect(getInspectionFocusProximity()).toBe(0)
  setInspectionFocus(0.5, -1, 0.4)
  expect(getInspectionFocus()).toBe(0.5)
  expect(getInspectionFocusDistance()).toBe(4.5)
  expect(getInspectionFocusProximity()).toBe(0.4)
})
test('player zoom suppresses the aim dot until the zoom transition reaches zero', () => {
  setPlayerZoom(0.01)
  expect(aimDot.getSnapshot()).toBe(false)
  setPlayerZoom(1)
  expect(aimDot.getSnapshot()).toBe(false)
  setPlayerZoom(0)
  expect(aimDot.getSnapshot()).toBe(true)
})
test('player zoom hides the interaction hint until the zoom transition reaches zero', () => {
  interactionHint.update({
    id: 'sign',
    title: 'Sign',
    keys: [
      {
        controls: ['KeyE'],
        action: 'Use',
      },
    ],
  }, 0, true)
  expect(interactionHint.getSnapshot().visible).toBe(true)
  setPlayerZoom(0.01)
  expect(interactionHint.getSnapshot().visible).toBe(false)
  setPlayerZoom(1)
  expect(interactionHint.getSnapshot().visible).toBe(false)
  setPlayerZoom(0)
  expect(interactionHint.getSnapshot().visible).toBe(true)
})
test('inspection focus keeps its blur factor until another one is given', () => {
  setInspectionFocus(1, 2, 0.5, 2)
  expect(getInspectionFocusBlur()).toBe(2)
  setInspectionFocus(0.3, 2, 0.5)
  expect(getInspectionFocusBlur()).toBe(2)
  setInspectionFocus(0.3, 2, 0.5, -1)
  expect(getInspectionFocusBlur()).toBe(2)
  setInspectionFocus(0, 1, 0, 1)
  expect(getInspectionFocusBlur()).toBe(1)
})
