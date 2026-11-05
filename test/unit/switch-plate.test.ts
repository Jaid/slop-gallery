import {expect, test} from 'bun:test'

import guillocheGold from '../../src/lib/materials/guilloche.ts'
import GuillocheGoldMaterial from '../../src/lib/materials/GuillocheGoldMaterial.ts'

test('switch plates with as many buttons share one engine-turned gold', () => {
  expect(guillocheGold(2)).toBeInstanceOf(GuillocheGoldMaterial)
  expect(guillocheGold(2)).toBe(guillocheGold(2))
  expect(guillocheGold(3)).not.toBe(guillocheGold(2))
})
