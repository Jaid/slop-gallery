import {expect, test} from 'bun:test'

import {galleryPlacement} from '../../src/lib/gallery/walls.ts'

// A 1 m work aimed at the Lobby’s south wall, beside the door, from 8 m away.
const aim = (y: number, labelAbove: boolean) => galleryPlacement.findPlacement([-4.6, y, 1], [0, 0, 1], 1, 1, [], '', labelAbove)
test('a placard that blocks a low spot moves above the frame', () => {
  const placement = aim(1.2, false)
  expect(placement?.valid).toBe(true)
  expect(placement?.labelAbove).toBe(true)
})
test('a placard above stays there wherever it fits', () => {
  expect(aim(2.7, true)?.labelAbove).toBe(true)
  expect(aim(2.7, false)?.labelAbove).toBe(false)
})
test('a placard that blocks a high spot above the frame moves back below it', () => {
  const placement = aim(4.2, true)
  expect(placement?.valid).toBe(true)
  expect(placement?.labelAbove).toBe(false)
})
test('a spot the frame itself does not fit stays invalid on either side', () => {
  const placement = aim(0.5, false)
  expect(placement?.valid).toBe(false)
  expect(placement?.labelAbove).toBe(false)
})
