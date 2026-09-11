import type {Object3D} from 'three/webgpu'

import {afterEach, expect, mock, test} from 'bun:test'

import {activateInteractiveObject, interactiveObjects, registerInteractiveObject} from '../../src/lib/gallery/interactiveObjects.ts'

afterEach(() => interactiveObjects.clear())
test('interactive objects activate by stable ID and clean up by identity', () => {
  const first = {
    activate: mock(() => {}),
    group: {} as Object3D,
  }
  const second = {
    activate: mock(() => {}),
    group: {} as Object3D,
  }
  const unregisterFirst = registerInteractiveObject('SFX-01', first)
  expect(activateInteractiveObject('missing')).toBe(false)
  expect(activateInteractiveObject('SFX-01')).toBe(true)
  expect(first.activate).toHaveBeenCalledTimes(1)
  registerInteractiveObject('SFX-01', second)
  unregisterFirst()
  expect(interactiveObjects.get('SFX-01')).toBe(second)
})
