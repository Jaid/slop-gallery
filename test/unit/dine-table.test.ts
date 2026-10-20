import {afterEach, beforeEach, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import dineTable, {dineTableApron, dineTablePosts, dineTableStretchers} from '../../src/lib/gallery/dineTable.ts'
import DineTableGeometry, {candleGeometry, candlestickGeometry, flameGeometry} from '../../src/lib/gallery/DineTableGeometry.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import {FeastInlayMaterial, FeastRunnerMaterial, FeastWoodMaterial} from '../../src/lib/materials/FeastTableMaterials.ts'

await RAPIER.init()
const dine = rooms.find(room => room.id === 'dine')!
let geometry: DineTableGeometry
beforeEach(() => {
  geometry = new DineTableGeometry
})
afterEach(() => geometry.dispose())
/** Every edge of a welded mesh belongs to exactly two triangles, and every face points the way its normals do. */
function solidSurface(buffer: import('three/webgpu').BufferGeometry) {
  const index = buffer.index!
  const position = buffer.getAttribute('position')
  const normal = buffer.getAttribute('normal')
  const edges = new Map<string, number>
  const key = (vertex: number) => [position.getX(vertex), position.getY(vertex), position.getZ(vertex)].map(value => Math.round(value * 1e4)).join(',')
  const a = new Vector3
  const b = new Vector3
  const c = new Vector3
  const face = new Vector3
  const shade = new Vector3
  const sample = new Vector3
  let inward = 0
  for (let triangle = 0; triangle < index.count / 3; triangle++) {
    const ids = [0, 1, 2].map(offset => index.getX(triangle * 3 + offset))
    a.fromBufferAttribute(position, ids[0])
    b.fromBufferAttribute(position, ids[1])
    c.fromBufferAttribute(position, ids[2])
    face.subVectors(b, a).cross(c.clone().sub(a))
    expect(face.length()).toBeGreaterThan(1e-8)
    shade.set(0, 0, 0)
    for (const id of ids) {
      shade.add(sample.fromBufferAttribute(normal, id))
    }
    if (face.normalize().dot(shade.normalize()) <= 0) {
      inward++
    }
    for (let edge = 0; edge < 3; edge++) {
      const pair = [key(ids[edge]), key(ids[(edge + 1) % 3])].toSorted().join('|')
      edges.set(pair, (edges.get(pair) ?? 0) + 1)
    }
  }
  let open = 0
  for (const count of edges.values()) {
    if (count !== 2) {
      open++
    }
  }
  return {
    inward,
    open,
  }
}
describe('Dine’s feast table', () => {
  test('sits on the room’s centerline, covers whole tiles and clears both arches', () => {
    const [x, y, z] = dineTable.position
    expect(y).toBe(0)
    expect(x).toBe(dine.center[0])
    expect(z).toBe(dine.center[1])
    expect(dineTable.length % 1).toBe(0)
    expect(dineTable.width % 1).toBe(0)
    const north = z - dineTable.length / 2
    const south = z + dineTable.length / 2
    const roomNorth = dine.center[1] - dine.size[1] / 2
    const roomSouth = dine.center[1] + dine.size[1] / 2
    // The Salon arch is centered in the north wall; the Lobby arch is on the west wall at z = 3.
    expect(north - roomNorth).toBeGreaterThan(2)
    expect(roomSouth - south).toBeGreaterThan(2)
    expect(Math.abs(x) + dineTable.width / 2).toBeLessThan(dine.center[0] + dine.size[0] / 2 - 3)
    expect(Math.abs(3 - z)).toBeGreaterThan(dineTable.length / 2)
    for (const plant of [[8.95, 7.1], [19.05, -15.05]]) {
      expect(Math.hypot(plant[0] - x, plant[1] - z)).toBeGreaterThan(dineTable.length / 2)
    }
  })
  test('the timber and the steel are closed, outward-wound solids inside a small triangle budget', () => {
    for (const part of [geometry.wood, geometry.steel, candlestickGeometry(), candleGeometry(), flameGeometry()]) {
      const surface = solidSurface(part)
      expect(surface.open).toBe(0)
      expect(surface.inward).toBe(0)
      part.computeBoundingBox()
    }
    expect(triangleCount(geometry.wood)).toBeLessThan(4000)
    expect(triangleCount(geometry.steel)).toBeLessThan(1200)
    const wood = geometry.wood.boundingBox!
    expect(wood.min.y).toBeGreaterThanOrEqual(dineTable.footHeight - 0.001)
    expect(wood.max.y).toBeCloseTo(dineTable.top, 3)
    expect(wood.max.x).toBeCloseTo(dineTable.width / 2, 3)
    expect(wood.max.z).toBeCloseTo(dineTable.length / 2, 3)
    const steel = geometry.steel.boundingBox!
    expect(steel.min.y).toBeGreaterThanOrEqual(-0.001)
    expect(steel.max.y).toBeLessThan(dineTable.footHeight + dineTable.footBar * 2)
  })
  test('the slab, apron, posts and stretchers are where the layout says they are', () => {
    const material = new MeshBasicMaterial
    const wood = new Mesh(geometry.wood, material)
    const steel = new Mesh(geometry.steel, material)
    const hits = (mesh: Mesh, origin: Vector3, direction: Vector3) => {
      const ray = new Raycaster(origin, direction.clone().normalize(), 0, 30)
      return ray.intersectObject(mesh)
    }
    const hit = (mesh: Mesh, origin: Vector3, direction: Vector3) => hits(mesh, origin, direction).length
    const down = new Vector3(0, -1, 0)
    try {
      expect(hit(wood, new Vector3(0, 2, 0), down)).toBe(2)
      expect(hit(wood, new Vector3(dineTable.width / 2 + 0.2, dineTable.top - dineTable.topThickness - dineTable.apronDrop / 2, 0), new Vector3(-1, 0, 0))).toBe(4)
      expect(hit(wood, new Vector3(0, dineTable.top - dineTable.topThickness - dineTable.apronDrop / 2, dineTable.length / 2 + 0.2), new Vector3(0, 0, -1))).toBe(2)
      for (const end of [-1, 1] as const) {
        for (const [x, z] of dineTablePosts(end)) {
          expect(hit(wood, new Vector3(x + 0.2, dineTable.stretcherY, z), new Vector3(-1, 0, 0))).toBeGreaterThanOrEqual(2)
        }
        expect(hit(steel, new Vector3(0, 1, end * dineTable.trestleOffset), down)).toBeGreaterThanOrEqual(1)
      }
      for (const x of dineTableStretchers) {
        const stretcher = hits(wood, new Vector3(x + 0.3, dineTable.stretcherY, 0), new Vector3(-1, 0, 0))
        expect(stretcher.length).toBeGreaterThan(0)
        expect(Math.abs(stretcher[0].point.x - x)).toBeLessThan(dineTable.stretcherRadius * 1.5)
      }
      // The middle of the table, between the trestles and under the slab, is open.
      expect(hit(wood, new Vector3(0, 0.4, 0), down)).toBe(0)
      expect(hit(steel, new Vector3(0, 0.4, 0), down)).toBe(0)
    } finally {
      material.dispose()
    }
  })
  test('the candlesticks stand on the slab and stay inside its top', () => {
    const stick = candlestickGeometry()
    const candle = candleGeometry()
    const flame = flameGeometry()
    try {
      for (const part of [stick, candle, flame]) {
        part.computeBoundingBox()
      }
      expect(stick.boundingBox!.min.y).toBeCloseTo(dineTable.top, 3)
      expect(candle.boundingBox!.min.y).toBeCloseTo(dineTable.top + dineTable.candlestickHeight, 2)
      expect(flame.boundingBox!.min.y).toBeGreaterThan(candle.boundingBox!.max.y - 0.001)
      for (const offset of dineTable.candlestickOffsets) {
        expect(Math.abs(offset)).toBeLessThan(dineTable.length / 2 - 0.3)
      }
      expect(dineTable.candlestickOffsets).toHaveLength(5)
    } finally {
      stick.dispose()
      candle.dispose()
      flame.dispose()
    }
  })
  test('the runner and the fillet are narrower than the slab and the runner hangs past both ends', () => {
    expect(dineTable.runnerWidth).toBeLessThan(dineTable.width / 2)
    expect(dineTable.runnerOverhang).toBeGreaterThan(0.2)
    expect(dineTable.runnerDrop).toBeGreaterThan(0.2)
    expect(dineTable.inlayWidth).toBeLessThan(0.02)
    expect(dineTableApron.x[1]).toBeLessThan(dineTable.width / 2)
    expect(dineTableApron.z[1]).toBeLessThan(dineTable.length / 2)
    const component = Bun.file(new URL('../../src/components/levels/gallery/DineTable/index.tsx', import.meta.url))
    const source = component.text()
    expect(source).resolves.toContain("name='dine-table'")
    expect(source).resolves.toContain('dineTableStretchers.map(')
  })
  test('the three materials shade from nodes and dispose cleanly', () => {
    const materials = [new FeastWoodMaterial, new FeastInlayMaterial, new FeastRunnerMaterial]
    let disposed = 0
    try {
      for (const material of materials) {
        expect(material.colorNode).not.toBeNull()
        expect(material.roughnessNode).not.toBeNull()
        material.addEventListener('dispose', () => disposed++)
      }
      expect(materials[0].normalNode).not.toBeNull()
      expect(materials[1].transparent).toBe(true)
      expect(materials[1].metalnessNode).not.toBeNull()
      const runner = new FeastRunnerMaterial
      materials.push(runner)
      expect(runner.sheen).toBeGreaterThan(0)
    } finally {
      for (const material of materials) {
        material.dispose()
      }
    }
    expect(disposed).toBe(3)
  })
  test('the colliders cover the slab and the trestles and leave the aisle open', () => {
    const world = new RAPIER.World({
      x: 0,
      y: 0,
      z: 0,
    })
    try {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...dineTable.position))
      world.createCollider(RAPIER.ColliderDesc.cuboid(dineTable.width / 2, dineTable.topThickness / 2, dineTable.length / 2).setTranslation(0, dineTable.top - dineTable.topThickness / 2, 0), body)
      world.createCollider(RAPIER.ColliderDesc.cuboid(dineTableApron.x[1], dineTable.apronDrop / 2, dineTableApron.z[1]).setTranslation(0, dineTable.top - dineTable.topThickness - dineTable.apronDrop / 2, 0), body)
      for (const end of [-1, 1] as const) {
        world.createCollider(RAPIER.ColliderDesc.cuboid(dineTable.footHalfWidth + dineTable.footBar, dineTable.footHeight / 2, dineTable.trestleThickness / 2).setTranslation(0, dineTable.footHeight / 2, end * dineTable.trestleOffset), body)
      }
      world.step()
      const down = {
        x: 0,
        y: -1,
        z: 0,
      }
      const cast = (x: number, z: number) => world.castRay(new RAPIER.Ray({
        x,
        y: 2,
        z,
      }, down), 2, true)
      const [tableX, , tableZ] = dineTable.position
      expect(cast(tableX, tableZ)).not.toBeNull()
      expect(cast(tableX, tableZ - dineTable.length / 2 + 0.1)).not.toBeNull()
      expect(cast(tableX + dineTable.width / 2 + 0.5, tableZ)).toBeNull()
      expect(cast(tableX, tableZ - dineTable.length / 2 - 1)).toBeNull()
    } finally {
      world.free()
    }
  })
})
