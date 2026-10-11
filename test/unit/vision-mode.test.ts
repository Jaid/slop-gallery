import {expect, test} from 'bun:test'

import {readVisionMode} from '../../src/lib/rendering/visionMode.ts'

test('vision mode URL values accept known modes only', () => {
  expect(readVisionMode('?vision_mode=wireframe')).toBe('wireframe')
  for (const search of ['', '?vision_mode=', '?vision_mode=xray', '?vision_mode=Wireframe', '?visionMode=wireframe']) {
    expect(readVisionMode(search)).toBeUndefined()
  }
})
