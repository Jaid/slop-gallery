import {expect, test} from 'bun:test'

import {Mesh, Raycaster, Texture, Vector3} from 'three/webgpu'

import {levelWallDistance as museumWallDistance} from '../../src/levels/gallery/navigation.ts'
import {levelWallDistance} from '../../src/levels/knottingham/navigation.ts'
import {knotGalleryBounds, knotGalleryCenter} from '../../src/lib/gallery/knotGallery.ts'
import {createKnotGeometry} from '../../src/lib/gallery/sculptures.ts'
import CryoBloomMaterial from '../../src/lib/knots/deepseek/items/cryo_bloom/material.ts'
import {knotFloatHeight} from '../../src/lib/knots/exhibition.ts'

test('a knot can be targeted across the museum wall that does not exist in Knottingham', () => {
  const environment = new Texture
  const geometry = createKnotGeometry()
  const material = new CryoBloomMaterial(environment)
  try {
    const mesh = new Mesh(geometry, material)
    // Fixed regression location across a museum wall, independent of exhibition ordering.
    mesh.position.set(-10.5, knotFloatHeight, -9)
    mesh.updateMatrixWorld()
    const origin = mesh.position.clone().add(new Vector3(Math.SQRT2, 0, Math.SQRT2))
    const direction = mesh.position.clone().sub(origin).normalize()
    const hit = new Raycaster(origin, direction, 0, 9).intersectObject(mesh)[0]
    expect(hit).toBeDefined()
    expect(museumWallDistance(origin.toArray(), direction.toArray())).toBeLessThan(hit.distance)
    expect(levelWallDistance(origin.toArray(), direction.toArray())).toBeGreaterThan(hit.distance)
  } finally {
    geometry.dispose()
    material.dispose()
    environment.dispose()
  }
})
test('Knottingham still blocks targeting beyond each actual room wall', () => {
  const {minX, maxX, northZ, southZ, height} = knotGalleryBounds
  const [x, , z] = knotGalleryCenter
  expect(levelWallDistance([x, 1, z], [1, 0, 0])).toBeCloseTo(maxX - x)
  expect(levelWallDistance([x, 1, z], [-1, 0, 0])).toBeCloseTo(x - minX)
  expect(levelWallDistance([x, 1, z], [0, 0, 1])).toBeCloseTo(southZ - z)
  expect(levelWallDistance([x, 1, z], [0, 0, -1])).toBeCloseTo(z - northZ)
  expect(levelWallDistance([x, 1, z], [2, 0, 0])).toBeCloseTo(maxX - x)
  expect(levelWallDistance([maxX + 2, 1, z], [-1, 0, 0])).toBeCloseTo(2)
  expect(levelWallDistance([maxX + 2, 1, z], [1, 0, 0])).toBe(Infinity)
  expect(levelWallDistance([x, height + 1, z], [1, 0, 0])).toBe(Infinity)
  expect(levelWallDistance([x, 1, z], [0, 1, 0])).toBe(Infinity)
  expect(levelWallDistance([x, 1, z], [0, 0, 0])).toBe(Infinity)
  expect(levelWallDistance([Number.NaN, 1, z], [1, 0, 0])).toBe(Infinity)
})
