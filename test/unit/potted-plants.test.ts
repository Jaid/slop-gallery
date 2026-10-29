import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {Box3, Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import destructiblePlants from '../../src/lib/gallery/destructiblePlants/catalog.ts'
import DestructiblePlantGeometry from '../../src/lib/gallery/destructiblePlants/DestructiblePlantGeometry.ts'
import {plants, potDefinition} from '../../src/lib/gallery/plantDecorations/catalog.ts'
import {potPlacements, pottedPlantKinds} from '../../src/lib/gallery/plantDecorations/placements.ts'
import PlantGeometry from '../../src/lib/gallery/plantDecorations/PlantGeometry.ts'
import {rooms} from './fixtures/gallery.ts'

function roomBounds(position: Vec3, inset: number) {
  const room = rooms.find(candidate => Math.abs(position[0] - candidate.center[0]) < candidate.size[0] / 2 && Math.abs(position[2] - candidate.center[1]) < candidate.size[1] / 2)!
  expect(room).toBeDefined()
  return new Box3(new Vector3(room.center[0] - room.size[0] / 2 + inset, -Infinity, room.center[1] - room.size[1] / 2 + inset), new Vector3(room.center[0] + room.size[0] / 2 - inset, Infinity, room.center[1] + room.size[1] / 2 - inset))
}
describe('placed pots', () => {
  test('the random pool includes every decorative and interactive variety exactly once', () => {
    expect(pottedPlantKinds).toEqual([...plants, ...destructiblePlants].map(plant => plant.id))
    const distinctKinds = new Set(pottedPlantKinds)
    expect(distinctKinds.size).toBe(pottedPlantKinds.length)
  })
  test('every pot placement is unique and stands inside its room', () => {
    const placementIds = new Set(potPlacements.map(placement => placement.id))
    expect(placementIds.size).toBe(potPlacements.length)
    for (const placement of potPlacements) {
      const pot = potDefinition(placement.pot)
      const allowed = roomBounds(placement.position, 0.25 + pot.radius)
      expect(allowed.containsPoint(new Vector3(...placement.position))).toBe(true)
    }
  })
  test.each(pottedPlantKinds)('%s clears the walls at every pot placement', kind => {
    const geometry = kind === 'birdOfParadise' || kind === 'peaceLily' ? new DestructiblePlantGeometry(kind) : new PlantGeometry(kind)
    try {
      const bounds = new Box3
      bounds.union(geometry.stems.boundingBox!)
      if (geometry instanceof DestructiblePlantGeometry) {
        for (const leaf of geometry.leaves) {
          const leafOrientation = new Quaternion
          leafOrientation.setFromEuler(new Euler(...leaf.rotation))
          const transform = new Matrix4
          transform.compose(new Vector3(...leaf.position), leafOrientation, new Vector3(1, 1, 1))
          for (const part of [leaf.geometry, leaf.stem]) {
            if (part) {
              bounds.union(part.boundingBox!.clone().applyMatrix4(transform))
            }
          }
        }
      } else {
        bounds.union(geometry.foliage.boundingBox!)
      }
      for (const placement of potPlacements) {
        const pot = potDefinition(placement.pot)
        const potPosition = new Vector3(...placement.position)
        const placed = bounds.clone().translate(potPosition.add(new Vector3(0, pot.soilHeight, 0)))
        expect(roomBounds(placement.position, wallFace + 0.02).containsBox(placed)).toBe(true)
      }
    } finally {
      geometry.dispose()
    }
  })
})
