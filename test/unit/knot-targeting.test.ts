import {expect, test} from 'bun:test'

import CryoBloomMaterial from 'knot-materials/entries/cryo_bloom/Material.ts'
import {knotFloatHeight} from 'knot-materials/exhibition.ts'
import {createKnotGeometry} from 'knot-materials/geometry.ts'
import {Mesh, Raycaster, Texture, Vector3} from 'three/webgpu'

import {knotGalleryBounds, knotGalleryCenter} from '../../src/lib/gallery/knotGallery.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import knottingham from '../../src/worlds/knottingham/index.ts'

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
    const targetingRay = new Raycaster(origin, direction, 0, 9)
    const hit = targetingRay.intersectObject(mesh)[0]
    expect(hit).toBeDefined()
    expect(slopGallery.wallDistance(origin.toArray(), direction.toArray())).toBeLessThan(hit.distance)
    expect(knottingham.wallDistance(origin.toArray(), direction.toArray())).toBeGreaterThan(hit.distance)
  } finally {
    geometry.dispose()
    material.dispose()
    environment.dispose()
  }
})
test('Knottingham still blocks targeting beyond each actual room wall', () => {
  const {minX, maxX, northZ, southZ, height} = knotGalleryBounds
  const [x, , z] = knotGalleryCenter
  expect(knottingham.wallDistance([x, 1, z], [1, 0, 0])).toBeCloseTo(maxX - x)
  expect(knottingham.wallDistance([x, 1, z], [-1, 0, 0])).toBeCloseTo(x - minX)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, 1])).toBeCloseTo(southZ - z)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, -1])).toBeCloseTo(z - northZ)
  expect(knottingham.wallDistance([x, 1, z], [2, 0, 0])).toBeCloseTo(maxX - x)
  expect(knottingham.wallDistance([maxX + 2, 1, z], [-1, 0, 0])).toBeCloseTo(2)
  expect(knottingham.wallDistance([maxX + 2, 1, z], [1, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, height + 1, z], [1, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, 1, z], [0, 1, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([Number.NaN, 1, z], [1, 0, 0])).toBe(Infinity)
})
