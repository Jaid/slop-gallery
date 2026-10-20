import type {BufferGeometry} from 'three/webgpu'

import {afterAll, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Euler, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import FeastChairGeometry from '../../src/lib/gallery/dineTable/FeastChairGeometry.ts'
import FeastServiceGeometry from '../../src/lib/gallery/dineTable/FeastServiceGeometry.ts'
import FeastTableGeometry from '../../src/lib/gallery/dineTable/FeastTableGeometry.ts'
import dineTable, {banquetChairs, banquetSettings} from '../../src/lib/gallery/dineTable/layout.ts'
import {timber} from '../../src/lib/gallery/dineTable/parts.ts'
import {rooms, roomVisit} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import FeastMaterials from '../../src/lib/materials/FeastMaterials.ts'

const table = new FeastTableGeometry
const chair = new FeastChairGeometry
const service = new FeastServiceGeometry
const tableParts = [table.wood, table.brass]
const chairParts = [chair.wood, chair.fabric, chair.brass]
const serviceParts = [service.brass, service.flames, service.linen, service.napkins, service.porcelain, service.silver, service.wax]
const allParts = [...tableParts, ...chairParts, ...serviceParts]
afterAll(() => {
  table.dispose()
  chair.dispose()
  service.dispose()
})
const bounds = (geometries: ReadonlyArray<BufferGeometry>) => {
  const box = new Box3
  for (const geometry of geometries) {
    geometry.computeBoundingBox()
    box.union(geometry.boundingBox!)
  }
  return box
}
test('the banquet is finite, normally shaded and stays within its complete eighteen-chair triangle budget', () => {
  const normal = new Vector3
  for (const geometry of allParts) {
    const count = geometry.getAttribute('position').count
    expect(count).toBeGreaterThan(0)
    for (const name of ['position', 'normal', 'uv']) {
      const attribute = geometry.getAttribute(name)
      expect(attribute.count).toBe(count)
      expect([...attribute.array].every(Number.isFinite)).toBe(true)
    }
    if (geometry.index) {
      expect([...geometry.index.array].every(index => index < count)).toBe(true)
    }
    const normals = geometry.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) {
      expect(normal.fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 5)
    }
  }
  const total = [...tableParts, ...serviceParts].reduce((sum, geometry) => sum + triangleCount(geometry), 0) + chairParts.reduce((sum, geometry) => sum + triangleCount(geometry), 0) * banquetChairs.length
  expect(total).toBeLessThan(120_000)
  expect(bounds(tableParts).max.y).toBeCloseTo(dineTable.height + 0.0007, 4)
  expect(bounds(tableParts).min.y).toBeCloseTo(0, 5)
  expect(bounds(tableParts).getSize(new Vector3).x).toBeCloseTo(dineTable.width, 4)
  expect(bounds(tableParts).getSize(new Vector3).z).toBeCloseTo(dineTable.length - 0.004, 3)
  expect(bounds(chairParts).max.y).toBeCloseTo(dineTable.chair.height, 4)
})
test('all joinery supplies its own grain coordinates before assembly', () => {
  for (const geometry of [table.wood, chair.wood]) {
    const grain = geometry.getAttribute('woodGrain')
    expect(grain.count).toBe(geometry.getAttribute('position').count)
    expect([...grain.array].every(Number.isFinite)).toBe(true)
    const seeds = new Set(Array.from({length: grain.count}, (_, i) => grain.getZ(i)))
    expect(seeds.size).toBeGreaterThan(5)
  }
  const original = chair.wood.clone()
  const mapped = timber(original, 'y', 0.25)
  const grain = mapped.getAttribute('woodGrain')
  const position = mapped.getAttribute('position')
  expect(grain.getX(7)).toBe(position.getY(7))
  const along = grain.getX(7)
  mapped.rotateY(1.3).translate(12, 3, -7)
  expect(grain.getX(7)).toBe(along)
  mapped.dispose()
})
test('eighteen chairs face their matching settings and leave the entire perimeter and visit pose clear', () => {
  expect(banquetChairs).toHaveLength(18)
  expect(banquetSettings).toHaveLength(18)
  const ids = new Set(banquetChairs.map(place => place.id))
  expect(ids.size).toBe(18)
  const room = rooms.find(candidate => candidate.id === 'dine')!
  const seating = new Box3
  for (const [index, placement] of banquetChairs.entries()) {
    const orientation = new Quaternion
    orientation.setFromEuler(new Euler(0, placement.yaw, 0))
    const matrix = new Matrix4
    matrix.compose(new Vector3(...placement.position), orientation, new Vector3(1, 1, 1))
    seating.union(bounds(chairParts).applyMatrix4(matrix))
    const towardPlate = new Vector3(...banquetSettings[index].position)
    towardPlate.sub(new Vector3(...placement.position)).setY(0).normalize()
    const forward = new Vector3(0, 0, -1)
    forward.applyQuaternion(orientation)
    expect(towardPlate.dot(forward)).toBeGreaterThan(0.999999)
    const [x, y, z] = banquetSettings[index].position
    expect(Math.abs(x) + 0.25).toBeLessThan(dineTable.width / 2)
    expect(Math.abs(z) + 0.25).toBeLessThan(dineTable.length / 2)
    expect(y).toBe(dineTable.height)
  }
  expect(room.size[0] / 2 - Math.max(Math.abs(seating.min.x), seating.max.x)).toBeGreaterThan(3.8)
  expect(room.size[1] / 2 - Math.max(Math.abs(seating.min.z), seating.max.z)).toBeGreaterThan(3.8)
  const visit = roomVisit(room).position
  expect(visit[2] - dineTable.position[2] - seating.max.z).toBeGreaterThan(1.4)
})
test('all eighteen porcelain plates sit above the top, including the end settings, and service stays on the board', () => {
  const material = new MeshBasicMaterial
  try {
    const mesh = new Mesh(service.porcelain, material)
    for (const {position} of banquetSettings) {
      const ray = new Raycaster(new Vector3(position[0], 2, position[2]), new Vector3(0, -1, 0))
      const hit = ray.intersectObject(mesh)[0]
      expect(hit).toBeDefined()
      expect(hit.point.y).toBeCloseTo(dineTable.height + 0.018, 5)
    }
    const box = bounds(serviceParts)
    expect(box.min.y).toBeGreaterThanOrEqual(dineTable.height)
    expect(Math.max(Math.abs(box.min.x), box.max.x)).toBeLessThan(dineTable.width / 2)
    expect(Math.max(Math.abs(box.min.z), box.max.z)).toBeLessThan(dineTable.length / 2)
    expect(box.max.y).toBeLessThan(1.7)
  } finally {
    material.dispose()
  }
})
test('welded physical surfaces match the tabletop, balusters and chair seat without blocking the space under the board', async () => {
  await RAPIER.init()
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  try {
    for (const geometry of [table.wood, chair.wood, chair.fabric]) {
      const [vertices, indices] = colliderGeometry(geometry)
      expect([...vertices].every(Number.isFinite)).toBe(true)
      expect(indices.length).toBeGreaterThan(0)
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
      if (geometry !== table.wood) {
        body.setTranslation({
          x: 3,
          y: 0,
          z: 0,
        }, false)
      }
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES), body)
    }
    world.step()
    const down = (x: number, z: number) => world.castRay(new RAPIER.Ray({
      x,
      y: 2,
      z,
    }, {
      x: 0,
      y: -1,
      z: 0,
    }), 2, true)
    for (const z of [-6.8, -3, 1, 4, 6.8]) {
      expect(down(0.5, z)!.timeOfImpact).toBeCloseTo(2 - dineTable.height, 5)
    }
    expect(down(3, -0.1)!.timeOfImpact).toBeCloseTo(2 - dineTable.chair.seatY - 0.02, 5)
    // The central space between the two turned columns is genuinely open, not a solid table-sized box.
    expect(world.castRay(new RAPIER.Ray({
      x: 0,
      y: 0.4,
      z: 1,
    }, {
      x: 0,
      y: 0,
      z: -1,
    }), 2, true)).toBeNull()
    const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0.5, 1.5, 1))
    world.createCollider(RAPIER.ColliderDesc.ball(0.08).setRestitution(0), ball)
    for (let i = 0; i < 180; i++) {
      world.step()
    }
    expect(ball.translation().y).toBeCloseTo(dineTable.height + 0.08, 2)
  } finally {
    world.free()
  }
})
test('every locally owned material and geometry is released', () => {
  const materials = new FeastMaterials
  const owned = [materials.wood, materials.brass, materials.porcelain, materials.linen, materials.velvet, materials.wax, materials.flame]
  let disposed = 0
  for (const material of owned) {
    material.addEventListener('dispose', () => disposed++)
    expect(material.transparent).toBe(false)
  }
  expect(materials.wood.colorNode).not.toBeNull()
  expect(materials.linen.normalNode).not.toBeNull()
  expect(materials.velvet.sheen).toBeGreaterThan(0)
  materials.dispose()
  expect(disposed).toBe(owned.length)
  const resources = [new FeastTableGeometry, new FeastChairGeometry, new FeastServiceGeometry]
  let released = 0
  for (const resource of resources) {
    for (const geometry of Object.values(resource) as Array<BufferGeometry>) {
      geometry.addEventListener('dispose', () => released++)
    }
    resource.dispose()
  }
  expect(released).toBe(12)
})
