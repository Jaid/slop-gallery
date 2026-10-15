import {expect, test} from 'bun:test'

import {corridorRunner, corridorStairs} from '../../src/lib/gallery/corridor.ts'
import StairFlight from '../../src/lib/gallery/stairs/StairFlight.ts'
import StairRunner from '../../src/lib/gallery/stairs/StairRunner.ts'
import StairRunnerMaterial from '../../src/lib/materials/StairRunnerMaterial.ts'

test('the runner material shades every corridor block without extra carpet meshes', () => {
  const material = new StairRunnerMaterial(corridorRunner)
  try {
    expect(material.runner).toBe(corridorRunner)
    for (const node of [material.colorNode, material.normalNode, material.roughnessNode, material.metalnessNode, material.sheenNode]) {
      expect(node).not.toBeNull()
    }
  } finally {
    material.dispose()
  }
})
test('one woven repeat spans exactly one tread and its riser', () => {
  expect(corridorRunner.stepLength).toBeCloseTo(corridorStairs.run + corridorStairs.rise)
  expect(corridorRunner.pathDistance(3, 'tread', 0) - corridorRunner.pathDistance(2, 'tread', 0)).toBeCloseTo(corridorRunner.stepLength)
})
test('runners are rejected when their rods would reach the flight edge or the steps are too shallow', () => {
  expect(() => new StairRunner(corridorStairs, corridorStairs.width - 0.3)).toThrow(RangeError)
  const shallow = new StairFlight('shallow', [0, 0, 0], [-1, -0.02, 0], 2, 4, 0, 0, 'corridor')
  expect(() => new StairRunner(shallow, 1)).toThrow(RangeError)
})
