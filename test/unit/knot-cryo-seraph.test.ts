import {expect, test} from 'bun:test'

import knotData from '../../packages/knot-materials/src/entries/cryo_seraph/data.ts'

test('Cryo Seraph’s peak vertex displacement stays within the declared culling and collision bound', () => {
  // The frost mound’s 0.0085 m peak plus the 0.0032 m swell.
  expect(0.0085 + 0.0032).toBeLessThanOrEqual(knotData.displacement)
})
