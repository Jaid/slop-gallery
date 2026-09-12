import type {ReactElement} from 'react'
import type {Object3D} from 'three/webgpu'

import {afterEach, expect, mock, test} from 'bun:test'

import {Group} from 'three/webgpu'

import InteractiveObject from '../../src/components/InteractiveObject/index.tsx'
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
test('interactive group registers on attachment and unregisters on disposal', () => {
  const activate = mock(() => {})
  const element = InteractiveObject({
    id: 'preview-test',
    onActivate: activate,
  }) as ReactElement<{ref: (group: Group) => () => void}>
  const group = new Group
  const cleanup = element.props.ref(group)
  expect(interactiveObjects.get('preview-test')?.group).toBe(group)
  expect(activateInteractiveObject('preview-test')).toBe(true)
  expect(activate).toHaveBeenCalledTimes(1)
  cleanup()
  expect(activateInteractiveObject('preview-test')).toBe(false)
})
