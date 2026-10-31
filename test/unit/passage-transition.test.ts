import {afterAll, describe, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {corridorEndZ, corridorPassage, lodgeThresholdSaddle} from '../../src/lib/gallery/corridor.ts'
import {polygonArea, polygonBounds} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressApproach, fortressTransition} from '../../src/lib/gallery/fortress.ts'
import lodge, {lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import PassageTransition, {transitionFrameDepth} from '../../src/lib/gallery/passages/PassageTransition.ts'
import SaddleGeometry from '../../src/lib/gallery/passages/SaddleGeometry.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import TransitionGeometry, {transitionClearance} from '../../src/lib/gallery/passages/TransitionGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import walls from './fixtures/gallery.ts'

const transition = fortressTransition
const geometry = new TransitionGeometry(transition)
const vault = new VaultGeometry(fortressApproach, transition.length)
const material = new MeshBasicMaterial({side: DoubleSide})
const timber = new Mesh(geometry.timber, material)
const lining = new Mesh(geometry.lining, material)
const ribs = new Mesh(vault.ribs, material)
for (const mesh of [timber, lining, ribs]) {
  mesh.updateMatrixWorld()
}
afterAll(() => {
  geometry.dispose()
  vault.dispose()
  material.dispose()
})
const half = fortressApproach.width / 2
const doorwayX = lodge.center[0] + lodge.size[0] / 2
// The approach runs west along its axis into the Lodge’s east doorway.
const spanStartX = fortressApproach.spans.at(-1)!.start[0]
const alongX = (distance: number) => spanStartX - distance
const lateral = (distance: number, y: number, side: -1 | 1, meshes: Array<Mesh>) => {
  const ray = new Raycaster(new Vector3(alongX(distance), lodge.floorY + y, lodge.tunnelZ), new Vector3(0, 0, side), 0, half + 0.5)
  return ray.intersectObjects(meshes)[0]?.distance
}
const upward = (distance: number) => {
  const ray = new Raycaster(new Vector3(alongX(distance), lodge.floorY + 1.6, lodge.tunnelZ), new Vector3(0, 1, 0), 0, 3)
  return ray.intersectObjects([timber, lining])[0]?.distance
}
const area = ({size}: {size: readonly [number, number]}) => size[0] * size[1]
/** the height of a mesh’s surface seen from above */
const floorAt = (x: number, z: number, mesh: Mesh) => {
  const ray = new Raycaster(new Vector3(x, lodge.floorY + 1, z), new Vector3(0, -1, 0), 0, 2)
  return ray.intersectObject(mesh)[0]?.point.y
}
describe('the Fortress’ timber transition into the Lodge', () => {
  test('occupies all of the approach, about its last meter, ending at the Lodge doorway', () => {
    expect(transition.length).toBeCloseTo(transition.spanLength, 9)
    expect(transition.length).toBeGreaterThan(transitionFrameDepth * 4)
    expect(alongX(transition.spanLength)).toBeCloseTo(doorwayX)
    expect(walls.find(wall => wall.id === 'lodge-east')!.center[0]).toBeCloseTo(doorwayX)
    expect(transition.frames[0]).toBeCloseTo(transition.spanLength - transition.length)
    expect(transition.frames[1] + transitionFrameDepth).toBeCloseTo(transition.spanLength)
    expect(transition.floor.size[0]).toBeCloseTo(transition.length)
    expect(transition.floor.size[1]).toBeCloseTo(fortressApproach.width)
    expect(transition.floor.center[0]).toBeCloseTo(doorwayX + transition.length / 2)
    geometry.sill.computeBoundingBox()
    expect(geometry.sill.boundingBox!.max.x).toBeCloseTo(alongX(transition.start))
  })
  test('leaves no timber on the stone side of the first portal', () => {
    for (const part of [geometry.timber, geometry.lining, geometry.sill, geometry.planks]) {
      part.computeBoundingBox()
      expect(part.boundingBox!.max.x).toBeLessThanOrEqual(alongX(transition.start) + 1e-6)
    }
  })
  test('stone paving and timber floor tile the passage floor without overlaps or slivers', () => {
    const total = fortressApproach.floors.reduce((sum, floor) => sum + polygonArea(floor), 0)
    const paved = transition.stoneFloors.reduce((sum, floor) => sum + polygonArea(floor), 0)
    expect(paved + area(transition.floor)).toBeCloseTo(total, 6)
    expect(area(transition.sill) + area(transition.planks)).toBeCloseTo(area(transition.floor), 6)
    for (const floor of transition.stoneFloors) {
      const bounds = polygonBounds(floor)
      expect(Math.min(...bounds.size)).toBeGreaterThan(0.1)
      const overlapX = Math.min(bounds.center[0] + bounds.size[0] / 2, transition.floor.center[0] + transition.floor.size[0] / 2) - Math.max(bounds.center[0] - bounds.size[0] / 2, transition.floor.center[0] - transition.floor.size[0] / 2)
      const overlapZ = Math.min(bounds.center[1] + bounds.size[1] / 2, transition.floor.center[1] + transition.floor.size[1] / 2) - Math.max(bounds.center[1] - bounds.size[1] / 2, transition.floor.center[1] - transition.floor.size[1] / 2)
      expect(overlapX <= 1e-9 || overlapZ <= 1e-9).toBe(true)
    }
  })
  test('the stone vault ribs stop before the timber begins', () => {
    vault.ribs.computeBoundingBox()
    expect(vault.ribs.boundingBox!.min.x).toBeGreaterThan(alongX(transition.start))
  })
  test('geometry is finite and within a modest triangle budget', () => {
    for (const part of [geometry.timber, geometry.lining, geometry.sill, geometry.planks]) {
      for (const attribute of Object.values(part.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
    }
    expect(triangleCount(geometry.timber) + triangleCount(geometry.lining) + triangleCount(geometry.sill) + triangleCount(geometry.planks)).toBeLessThan(2000)
  })
  test('the passage axis stays clear and the walkable width only loses the baseboard depth', () => {
    for (const y of [0.1, 1.6, 2.8]) {
      const ray = new Raycaster(new Vector3(alongX(transition.start - 1), lodge.floorY + y, lodge.tunnelZ), new Vector3(-1, 0, 0), 0, transition.length + 2)
      expect(ray.intersectObjects([timber, lining])).toHaveLength(0)
    }
    for (const distance of [...transition.frames.map(frame => frame + transitionFrameDepth / 2), (transition.frames[0] + transition.frames[1] + transitionFrameDepth) / 2]) {
      for (const side of [-1, 1] as const) {
        const hit = lateral(distance, 0.2, side, [timber, lining])
        expect(hit).toBeCloseTo(half - transitionClearance, 3)
      }
    }
  })
  test('boards over the stone walls and vault between the portals', () => {
    const stoneFace = half - wallFace
    const boarded = (transition.frames[0] + transition.frames[1] + transitionFrameDepth) / 2
    for (const side of [-1, 1] as const) {
      for (const y of [0.2, 0.8, 1.6]) {
        expect(lateral(boarded, y, side, [timber, lining])).toBeLessThan(stoneFace)
      }
      // Just before the first portal, the stone is still bare.
      expect(lateral(transition.start - 0.1, 1.6, side, [timber, lining])).toBeUndefined()
    }
    expect(upward(boarded)).toBeLessThan(fortressApproach.height - 1.6)
    expect(upward(transition.start - 0.1)).toBeUndefined()
  })
  test('the saddle under the first portal stands 3 cm proud, beveled down to the flush floors on both sides', () => {
    const sill = new Mesh(geometry.sill, material)
    const planks = new Mesh(geometry.planks, material)
    const middle = transition.frames[0] + transitionFrameDepth / 2
    for (const across of [-1.5, 0, 1.5]) {
      const z = lodge.tunnelZ + across
      expect(floorAt(alongX(middle), z, sill)).toBeCloseTo(lodge.floorY + 0.03, 5)
      // Halfway down either bevel.
      for (const edge of [transition.frames[0] + 0.025, transition.frames[0] + transitionFrameDepth - 0.025]) {
        expect(floorAt(alongX(edge), z, sill)).toBeCloseTo(lodge.floorY + 0.015, 5)
      }
      expect(floorAt(alongX((transition.frames[0] + transitionFrameDepth + transition.spanLength) / 2), z, planks)).toBeCloseTo(lodge.floorY, 5)
    }
  })
  test('the Corridor doorway’s saddle covers the joint of the Lodge’s planks and the Corridor’s boards, right under the rib above it', () => {
    // The doorway passage runs north out of the Lodge’s bay.
    const {center: [x, z], size: [width, depth]} = lodgeThresholdSaddle
    expect(width).toBe(corridorPassage.width)
    expect(Math.abs(corridorEndZ - z)).toBeLessThan(depth / 2 - 0.05)
    const saddle = SaddleGeometry.across(lodgeThresholdSaddle, corridorPassage.floorY)
    const corridorTimber = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
    try {
      expect(floorAt(x, z, new Mesh(saddle, material))).toBeCloseTo(corridorPassage.floorY + 0.03, 5)
      const doorwayRibs = new Mesh(corridorTimber.ribs, material)
      // Toward the rib’s post, a little above the saddle: just inside its ends the post stands on it, just outside there is none.
      const post = (along: number) => {
        // Across to the passage’s wall, short of the diagonal round the bay behind it.
        const ray = new Raycaster(new Vector3(x, corridorPassage.floorY + 0.1, along), new Vector3(-1, 0, 0), 0, width / 2)
        return ray.intersectObject(doorwayRibs)[0]?.distance
      }
      for (const side of [-1, 1]) {
        expect(post(z + side * (depth / 2 - 0.005))).toBeCloseTo(width / 2 - 0.25, 3)
        expect(post(z + side * (depth / 2 + 0.005))).toBeUndefined()
      }
    } finally {
      saddle.dispose()
      corridorTimber.dispose()
    }
  })
  test('rejects transitions that do not fit their final span', () => {
    const passage = new Passage('short', 'lodge', [[0, 0], [0, -6], [-3, -6]], 0, 2.6)
    for (const length of [0.5, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new PassageTransition(passage, length)).toThrow(RangeError)
    }
    const fitting = new PassageTransition(passage, 1.5)
    expect(fitting.start).toBeCloseTo(1.5)
    for (const ribFreeEnd of [-1, Number.NaN]) {
      expect(() => new VaultGeometry(passage, ribFreeEnd)).toThrow(RangeError)
    }
  })
})
