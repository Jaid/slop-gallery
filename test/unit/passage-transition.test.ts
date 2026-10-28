import {afterAll, describe, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import lodge, {lodgeTunnel, lodgeTunnelTransition} from '../../src/lib/gallery/lodge.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import PassageTransition, {transitionFrameDepth} from '../../src/lib/gallery/passages/PassageTransition.ts'
import TransitionGeometry, {transitionClearance} from '../../src/lib/gallery/passages/TransitionGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import walls from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

const transition = lodgeTunnelTransition
const geometry = new TransitionGeometry(transition)
const vault = new VaultGeometry(lodgeTunnel, transition.length)
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
const half = lodgeTunnel.width / 2
const doorwayX = lodge.center[0] + lodge.size[0] / 2
// The final span runs west along the tunnel axis into the Lodge’s east doorway.
const spanStartX = lodgeTunnel.spans.at(-1)!.start[0]
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
describe('Lodge tunnel timber transition', () => {
  test('occupies the last two meters of the tunnel, ending at the Lodge doorway', () => {
    expect(transition.length).toBe(2)
    expect(alongX(transition.spanLength)).toBeCloseTo(doorwayX)
    expect(walls.find(wall => wall.id === 'lodge-east')!.center[0]).toBeCloseTo(doorwayX)
    expect(transition.frames[0]).toBeCloseTo(transition.spanLength - 2)
    expect(transition.frames[2] + transitionFrameDepth).toBeCloseTo(transition.spanLength)
  })
  test('keeps the stone paving through the wainscoted bay, laying timber from the middle portal on', () => {
    const timberLength = transition.spanLength - transition.frames[1]
    expect(transition.floor.size[0]).toBeCloseTo(timberLength)
    expect(transition.floor.size[1]).toBeCloseTo(lodgeTunnel.width)
    expect(transition.floor.center[0]).toBeCloseTo(doorwayX + timberLength / 2)
    expect(transition.sill.center[0]).toBeCloseTo(alongX(transition.frames[1] + transitionFrameDepth / 2))
    geometry.sill.computeBoundingBox()
    expect(geometry.sill.boundingBox!.max.x).toBeCloseTo(alongX(transition.frames[1]))
  })
  test('stone paving and timber floor tile the passage floor without overlaps or slivers', () => {
    const total = lodgeTunnel.floors.reduce((sum, floor) => sum + area(floor), 0)
    const paved = transition.stoneFloors.reduce((sum, floor) => sum + area(floor), 0)
    expect(paved + area(transition.floor)).toBeCloseTo(total, 6)
    expect(area(transition.sill) + area(transition.planks)).toBeCloseTo(area(transition.floor), 6)
    for (const floor of transition.stoneFloors) {
      expect(Math.min(...floor.size)).toBeGreaterThan(0.1)
      const overlapX = Math.min(floor.center[0] + floor.size[0] / 2, transition.floor.center[0] + transition.floor.size[0] / 2) - Math.max(floor.center[0] - floor.size[0] / 2, transition.floor.center[0] - transition.floor.size[0] / 2)
      const overlapZ = Math.min(floor.center[1] + floor.size[1] / 2, transition.floor.center[1] + transition.floor.size[1] / 2) - Math.max(floor.center[1] - floor.size[1] / 2, transition.floor.center[1] - transition.floor.size[1] / 2)
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
    for (const distance of [...transition.frames.map(frame => frame + transitionFrameDepth / 2), transition.frames[0] + 0.5, transition.frames[1] + 0.5]) {
      for (const side of [-1, 1] as const) {
        const hit = lateral(distance, 0.2, side, [timber, lining])
        expect(hit).toBeCloseTo(half - transitionClearance, 3)
      }
    }
  })
  test('stages the change: wainscot under the stone vault, then fully boarded', () => {
    const stoneFace = half - wallFace
    const wainscot = (transition.frames[0] + transition.frames[1] + transitionFrameDepth) / 2
    const boarded = (transition.frames[1] + transition.frames[2] + transitionFrameDepth) / 2
    for (const side of [-1, 1] as const) {
      // Below the rail, both bays hide the stone wall and its baseboard.
      for (const y of [0.2, 0.8]) {
        expect(lateral(wainscot, y, side, [timber, lining])).toBeLessThan(stoneFace)
        expect(lateral(boarded, y, side, [timber, lining])).toBeLessThan(stoneFace)
      }
      // Above the rail, stone still shows in the first bay and is boarded over in the second.
      expect(lateral(wainscot, 1.6, side, [timber, lining])).toBeUndefined()
      expect(lateral(boarded, 1.6, side, [timber, lining])).toBeLessThan(stoneFace)
    }
    expect(upward(wainscot)).toBeUndefined()
    expect(upward(boarded)).toBeLessThan(lodgeTunnel.height - 1.6)
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
