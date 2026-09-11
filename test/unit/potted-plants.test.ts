import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {Box3, Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import destructiblePlants from '../../src/lib/gallery/destructiblePlants/catalog.ts'
import DestructiblePlantGeometry from '../../src/lib/gallery/destructiblePlants/DestructiblePlantGeometry.ts'
import {plants, potDefinition} from '../../src/lib/gallery/plantDecorations/catalog.ts'
import {potPlacements, pottedPlantKinds} from '../../src/lib/gallery/plantDecorations/placements.ts'
import PlantGeometry from '../../src/lib/gallery/plantDecorations/PlantGeometry.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'

function roomBounds(position: Vec3, inset: number) {
  const room = rooms.find(candidate => Math.abs(position[0] - candidate.center[0]) < candidate.size[0] / 2 && Math.abs(position[2] - candidate.center[1]) < candidate.size[1] / 2)!
  expect(room).toBeDefined()
  return new Box3(new Vector3(room.center[0] - room.size[0] / 2 + inset, -Infinity, room.center[1] - room.size[1] / 2 + inset), new Vector3(room.center[0] + room.size[0] / 2 - inset, Infinity, room.center[1] + room.size[1] / 2 - inset))
}
describe('placed pots', () => {
  test('the random pool includes every decorative and interactive variety exactly once', () => {
    expect(pottedPlantKinds).toEqual([...plants, ...destructiblePlants].map(plant => plant.id))
    expect(new Set(pottedPlantKinds).size).toBe(10)
  })
  test('only the requested pots are placed', () => {
    expect(potPlacements).toEqual([
      {
        id: 'prop-dine-southwest-plant',
        pot: 'ivory',
        position: [8.95, 0.001, 7.1],
      },
      {
        id: 'prop-dine-northeast-plant',
        pot: 'ivory',
        position: [19.05, 0.001, -7.05],
      },
      {
        id: 'prop-lobby-northwest-plant',
        pot: 'celadon',
        position: [-7.09, 0, -7.01],
      },
      {
        id: 'prop-lobby-northeast-plant',
        pot: 'celadon',
        position: [7.09, 0, -7.01],
      },
    ])
    expect(new Set(potPlacements.map(placement => placement.id)).size).toBe(potPlacements.length)
    for (const placement of potPlacements) {
      const pot = potDefinition(placement.pot)
      const allowed = roomBounds(placement.position, 0.25 + pot.radius)
      expect(allowed.containsPoint(new Vector3(...placement.position))).toBe(true)
    }
  })
  test.each(pottedPlantKinds)('%s clears the walls at every pot placement', kind => {
    const geometry = kind === 'birdOfParadise' || kind === 'peaceLily' ? new DestructiblePlantGeometry(kind) : new PlantGeometry(kind)
    try {
      const bounds = (new Box3).union(geometry.stems.boundingBox!)
      if (geometry instanceof DestructiblePlantGeometry) {
        for (const leaf of geometry.leaves) {
          const transform = (new Matrix4).compose(new Vector3(...leaf.position), (new Quaternion).setFromEuler(new Euler(...leaf.rotation)), new Vector3(1, 1, 1))
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
        const placed = bounds.clone().translate(new Vector3(...placement.position).add(new Vector3(0, pot.soilHeight, 0)))
        expect(roomBounds(placement.position, wallFace + 0.02).containsBox(placed)).toBe(true)
      }
    } finally {
      geometry.dispose()
    }
  })
})
