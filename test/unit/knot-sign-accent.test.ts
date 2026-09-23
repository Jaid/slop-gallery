import {expect, test} from 'bun:test'

import signAccentColor from '../../src/components/levels/knottingham/signAccentColor.ts'

test('sign accents clamp dark and oversaturated placeholder colors into a readable HSL range', () => {
  expect(signAccentColor('#1d1436')).toBe('rgb(162,143,214)')
  expect(signAccentColor('#0000ff')).toBe('rgb(121,121,236)')
  expect(signAccentColor('#ffffff')).toBe('rgb(217,217,217)')
})
