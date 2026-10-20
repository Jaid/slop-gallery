import type {BufferGeometry} from 'three/webgpu'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import ExtrudedProfileGeometry from '../../src/lib/gallery/ExtrudedProfileGeometry.ts'
import FeastChairGeometry from '../../src/lib/gallery/feastTable/FeastChairGeometry.ts'
import FeastSegmentGeometry from '../../src/lib/gallery/feastTable/FeastSegmentGeometry.ts'
import FeastTableGeometry from '../../src/lib/gallery/feastTable/FeastTableGeometry.ts'
import feastTable, {centerpieceY, feastCenterpieces, feastColliders, feastSeats, feastSegments, feastTableFrame, placeSetting, seatDimensions, segmentOf, settingOffset, tableware} from '../../src/lib/gallery/feastTable/layout.ts'
import {potPlacements} from '../../src/lib/gallery/plantDecorations/placements.ts'
import {roomBoxes} from '../../src/lib/gallery/roomVisibility.ts'
import walls, {roomAt, rooms, roomVisit} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import FeastTableMaterials from '../../src/lib/materials/FeastTableMaterials.ts'
import gold from '../../src/lib/materials/gold.ts'
import metal from '../../src/lib/materials/metal.ts'
import WalnutMaterial, {mahogany} from '../../src/lib/materials/WalnutMaterial.ts'

await RAPIER.init()
const dine = rooms.find(room => room.id === 'dine')!
const dineBox = roomBoxes.find(room => room.id === 'dine')!.box
const table = new FeastTableGeometry
const segments = feastSegments.map((_, index) => new FeastSegmentGeometry(index))
afterAll(() => {
  table.dispose()
  for (const segment of segments) {
    segment.dispose()
  }
})
const toWorld = (x: number, y: number, z: number) => new Vector3(x + feastTable.position[0], y + feastTable.position[1], z + feastTable.position[2])
const allGeometry = () => [table.wood, table.runner, table.braid, ...segments.flatMap(segment => segment.parts.map(part => part.geometry))]
const worldBounds = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!.clone()
  return box.translate(new Vector3(...feastTable.position))
}
/**
 * Every triangle’s face normal agrees with its vertex normals, and every edge is shared by an even number of triangles: two on a single solid, four where merged parts meet face to face, like neighboring boards.
 */
const expectClosedAndOutward = (geometry: BufferGeometry, {faceToFace = false} = {}) => {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const index = geometry.index!
  const edges = new Map<string, number>
  const key = (vertex: number) => [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)].map(value => Math.round(value * 1e5)).join(':')
  const a = new Vector3
  const b = new Vector3
  const c = new Vector3
  const shading = new Vector3
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    a.fromBufferAttribute(positions, ids[0])
    b.fromBufferAttribute(positions, ids[1]).sub(a)
    c.fromBufferAttribute(positions, ids[2]).sub(a)
    const face = b.cross(c)
    expect(face.length()).toBeGreaterThan(1e-12)
    shading.set(0, 0, 0)
    for (const id of ids) {
      shading.x += normals.getX(id)
      shading.y += normals.getY(id)
      shading.z += normals.getZ(id)
    }
    expect(face.normalize().dot(shading.normalize())).toBeGreaterThan(0.5)
    for (let j = 0; j < 3; j++) {
      const edge = [key(ids[j]), key(ids[(j + 1) % 3])].toSorted().join('/')
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  expect(edges.values().every(count => (faceToFace ? count % 2 === 0 : count === 2))).toBe(true)
}
describe('ExtrudedProfileGeometry', () => {
  test('either winding gives a closed, outward-facing solid with smooth round-overs and crisp arrises', () => {
    const square: Array<readonly [number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]]
    for (const section of [square, square.toReversed()]) {
      const geometry = new ExtrudedProfileGeometry(section, -0.5, 0.5)
      try {
        expectClosedAndOutward(geometry)
        geometry.computeBoundingBox()
        expect(geometry.boundingBox!.min.toArray()).toEqual([0, 0, -0.5])
        expect(geometry.boundingBox!.max.toArray()).toEqual([1, 1, 0.5])
        // A square’s right angles stay hard: 4 sides × 4 corners plus two caps of 4.
        expect(geometry.getAttribute('position').count).toBe(24)
      } finally {
        geometry.dispose()
      }
    }
    const round = Array.from({length: 24}, (_, index) => [Math.cos(index / 24 * Math.PI * 2), Math.sin(index / 24 * Math.PI * 2)] as const)
    const cylinder = new ExtrudedProfileGeometry(round, 0, 1)
    try {
      expectClosedAndOutward(cylinder)
      const positions = cylinder.getAttribute('position')
      const normals = cylinder.getAttribute('normal')
      for (let index = 0; index < positions.count; index++) {
        if (Math.abs(normals.getZ(index)) > 0.5) {
          continue
        }
        // Side normals point radially, shared across the facets.
        expect(normals.getX(index) * positions.getX(index) + normals.getY(index) * positions.getY(index)).toBeGreaterThan(0.999)
      }
    } finally {
      cylinder.dispose()
    }
  })
  test('rejects degenerate sections', () => {
    expect(() => new ExtrudedProfileGeometry([[0, 0], [1, 0]], 0, 1)).toThrow(RangeError)
    expect(() => new ExtrudedProfileGeometry([[0, 0], [1, 0], [1, 1]], 1, 1)).toThrow(RangeError)
    expect(() => new ExtrudedProfileGeometry([[0, 0], [0, 0], [1, 1]], 0, 1)).toThrow(RangeError)
  })
})
describe('Dine’s feast table layout', () => {
  test('stands in the middle of Dine, clear of the doorways, the visit spot and the potted plants', () => {
    expect(feastTable.position).toEqual([dine.center[0], 0, dine.center[1]])
    const halfReach = feastTableFrame.halfLength + feastTable.chair.headGap + seatDimensions.head.depth / 2
    // The arch to the Salon and the visit spot stay a few strides away from the head chairs.
    expect(dine.size[1] / 2 - halfReach).toBeGreaterThan(5)
    const visit = roomVisit(dine).position
    expect(visit[2] - (dine.center[1] + halfReach)).toBeGreaterThan(2.5)
    const westDoor = walls.find(wall => wall.id === 'dine-west')!
    const sideReach = feastTableFrame.halfWidth - feastTable.chair.tuck + seatDimensions.side.depth + 0.05
    // Walkways beside the chairs, from their backs to the paneled walls.
    expect(dine.size[0] / 2 - sideReach - 0.105).toBeGreaterThan(4.5)
    expect(westDoor.holes).toHaveLength(1)
    const dinePots = potPlacements.filter(placement => placement.id.includes('dine'))
    expect(dinePots).toHaveLength(2)
    for (const pot of dinePots) {
      expect(Math.abs(pot.position[0] - dine.center[0])).toBeGreaterThan(sideReach + 1)
    }
  })
  test('ten side chairs per side and a carver at each end, each facing the table and clear of its legs and neighbors', () => {
    expect(feastSeats.filter(seat => seat.kind === 'side')).toHaveLength(20)
    expect(feastSeats.filter(seat => seat.kind === 'head')).toHaveLength(2)
    const footprints = feastSeats.map(seat => {
      const {width, depth} = seatDimensions[seat.kind]
      const turned = Math.abs(Math.sin(seat.yaw)) > 0.5
      const [x, , z] = seat.position
      const half = turned ? [depth / 2, width / 2] : [width / 2, depth / 2]
      return {
        seat,
        min: [x - half[0], z - half[1]],
        max: [x + half[0], z + half[1]],
      }
    })
    for (const {seat, min, max} of footprints) {
      // The chair’s front, its local +z, points at the table’s middle line or along it toward the middle.
      const forward = [Math.sin(seat.yaw), Math.cos(seat.yaw)]
      const toCenter = seat.kind === 'side' ? [-Math.sign(seat.position[0]), 0] : [0, -Math.sign(seat.position[2])]
      expect(forward[0] * toCenter[0] + forward[1] * toCenter[1]).toBeCloseTo(1, 9)
      // Pushed in: the seat’s front tucks under the top’s edge, its back stays out.
      if (seat.kind === 'side') {
        expect(Math.min(Math.abs(min[0]), Math.abs(max[0]))).toBeLessThan(feastTableFrame.halfWidth)
        expect(Math.max(Math.abs(min[0]), Math.abs(max[0]))).toBeGreaterThan(feastTableFrame.halfWidth)
      }
      for (const z of feastTable.leg.z) {
        for (const side of [-1, 1]) {
          const legX = side * feastTableFrame.legX
          const clear = legX + feastTable.leg.radius < min[0] || legX - feastTable.leg.radius > max[0] || z + feastTable.leg.radius < min[1] - 0.05 || z - feastTable.leg.radius > max[1] + 0.05
          expect(clear).toBe(true)
        }
      }
    }
    for (const [index, a] of footprints.entries()) {
      for (const b of footprints.slice(index + 1)) {
        const gap = Math.max(b.min[0] - a.max[0], a.min[0] - b.max[0], b.min[1] - a.max[1], a.min[1] - b.max[1])
        expect(gap).toBeGreaterThan(0.4)
      }
    }
  })
  test('every diner has a whole setting on the top, clear of the runner, the centerpieces and the other settings', () => {
    const runnerEdge = feastTable.runner.width / 2
    const plates = feastSeats.map(placeSetting)
    for (const [index, setting] of plates.entries()) {
      const seat = feastSeats[index]
      const [x, , z] = setting.position
      expect(Math.abs(x) + tableware.plate.radius).toBeLessThan(feastTableFrame.halfWidth)
      expect(Math.abs(z) + tableware.plate.radius).toBeLessThan(feastTableFrame.halfLength)
      const goblet = settingOffset(setting, tableware.goblet.offset)
      if (seat.kind === 'side') {
        // Side settings stand on the bare wood; the goblet stays off the braid.
        expect(Math.abs(x) - tableware.plate.radius).toBeGreaterThan(runnerEdge)
        expect(Math.abs(goblet[0]) - tableware.goblet.radius).toBeGreaterThan(runnerEdge + 0.02)
        expect(setting.position[1]).toBe(feastTable.height)
      } else {
        // Head settings stand on the runner, within its braid.
        expect(Math.abs(goblet[0]) + tableware.goblet.radius).toBeLessThan(runnerEdge - feastTable.runner.braid)
        expect(setting.position[1]).toBe(centerpieceY)
      }
      // The goblet stands at the diner’s upper right: away from them and to their right.
      const forward = [Math.sin(seat.yaw), Math.cos(seat.yaw)]
      const offset = [goblet[0] - x, goblet[2] - z]
      expect(offset[0] * forward[0] + offset[1] * forward[1]).toBeCloseTo(tableware.goblet.offset[1], 9)
      for (const piece of feastCenterpieces) {
        const reach = tableware[piece.kind].radius + (piece.kind === 'tazza' ? 0.08 : 0)
        expect(Math.hypot(goblet[0], goblet[2] - piece.z)).toBeGreaterThan(reach + tableware.goblet.radius)
        expect(Math.hypot(x, z - piece.z)).toBeGreaterThan(reach + tableware.plate.radius)
      }
      for (const other of plates.slice(index + 1)) {
        expect(Math.hypot(other.position[0] - x, other.position[2] - z)).toBeGreaterThan(tableware.plate.radius * 2 + 0.3)
      }
    }
  })
  test('the three runs share out every chair and centerpiece, and the tableware stands on the top in Dine', () => {
    expect(feastSeats.every(seat => segmentOf(seat.position[2]) >= 0)).toBe(true)
    expect(feastCenterpieces.every(piece => segmentOf(piece.z) >= 0)).toBe(true)
    // Every run has its own chairs.
    expect(feastSegments.map((_, index) => feastSeats.filter(seat => segmentOf(seat.position[2]) === index).length)).toEqual([7, 8, 7])
    expect(roomAt(toWorld(0, 1, 0).toArray())).toBe('dine')
  })
})
describe('feast table geometry', () => {
  test('is finite, inside Dine’s room box and within its triangle budget', () => {
    let triangles = 0
    for (const geometry of allGeometry()) {
      const positions = geometry.getAttribute('position')
      expect(positions.count).toBeGreaterThan(0)
      expect([...positions.array].every(Number.isFinite)).toBe(true)
      expect(geometry.hasAttribute('normal')).toBe(true)
      // Declared as Dine’s in the scene, so it must really lie within the room’s box.
      expect(dineBox.containsBox(worldBounds(geometry))).toBe(true)
      triangles += triangleCount(geometry)
    }
    expect(triangles).toBeLessThan(200_000)
    expect(triangles).toBeGreaterThan(100_000)
  })
  test('every timber carries a finite grain with a distinct seed per piece', () => {
    for (const geometry of [table.wood, ...segments.map(segment => segment.geometry('wood')!)]) {
      const grain = geometry.getAttribute('woodGrain')
      expect(grain.count).toBe(geometry.getAttribute('position').count)
      expect([...grain.array].every(Number.isFinite)).toBe(true)
      const seeds = new Set<number>
      for (let index = 0; index < grain.count; index++) {
        seeds.add(Math.round(grain.getZ(index) * 1e5))
      }
      expect(seeds.size).toBeGreaterThan(geometry === table.wood ? 20 : 60)
    }
  })
  test('the top is level at its height, molded along both long edges and carries the runner and its overhangs', () => {
    table.wood.computeBoundingBox()
    const box = table.wood.boundingBox!
    expect(box.max.y).toBeCloseTo(feastTable.height, 6)
    expect(box.min.y).toBeCloseTo(0, 6)
    expect(box.max.x).toBeCloseTo(feastTableFrame.halfWidth, 6)
    expect(box.max.z).toBeCloseTo(feastTableFrame.halfLength, 6)
    const material = new MeshBasicMaterial
    const meshes = [new Mesh(table.wood, material), new Mesh(table.runner, material), new Mesh(table.braid, material)]
    try {
      const down = new Vector3(0, -1, 0)
      const hit = (x: number, z: number) => {
        const ray = new Raycaster(new Vector3(x, 2, z), down)
        return ray.intersectObjects(meshes)[0]
      }
      // Bare wood beside the runner, the runner in the middle and the braid along its edges.
      expect(hit(0.4, 1).object).toBe(meshes[0])
      expect(hit(0.4, 1).point.y).toBeCloseTo(feastTable.height, 5)
      expect(hit(0.05, 1).object).toBe(meshes[1])
      expect(hit(0.05, 1).point.y).toBeCloseTo(feastTable.height + feastTable.runner.thickness, 5)
      expect(hit(feastTable.runner.width / 2 - 0.005, 1).object).toBe(meshes[2])
      // The molded edge rounds over: a ray just inside the edge lands lower than the top.
      expect(hit(feastTableFrame.halfWidth - 0.003, 1).point.y).toBeLessThan(feastTable.height - 0.005)
      // The runner hangs down over both ends.
      for (const end of [-1, 1]) {
        const ray = new Raycaster(new Vector3(0, feastTable.height - 0.2, end * (feastTableFrame.halfLength + 1)), new Vector3(0, 0, -end))
        const side = ray.intersectObjects(meshes)[0]
        expect(side.object).toBe(meshes[1])
      }
    } finally {
      material.dispose()
    }
  })
  test('the table frame and chairs are closed solids with outward faces', () => {
    expectClosedAndOutward(table.wood, {faceToFace: true})
    for (const kind of ['side', 'head'] as const) {
      const chair = new FeastChairGeometry(kind)
      try {
        for (const geometry of [chair.wood, chair.upholstery, chair.gold]) {
          expectClosedAndOutward(geometry, {faceToFace: true})
        }
        chair.wood.computeBoundingBox()
        chair.upholstery.computeBoundingBox()
        const {seatHeight, backHeight, width} = seatDimensions[kind]
        expect(chair.upholstery.boundingBox!.max.y).toBeLessThan(backHeight)
        expect(chair.wood.boundingBox!.min.y).toBeCloseTo(0, 6)
        expect(chair.wood.boundingBox!.max.y).toBeLessThanOrEqual(backHeight + 0.001)
        expect(chair.wood.boundingBox!.max.x).toBeLessThanOrEqual(width / 2 + 0.001)
        // The seat cushion is where the colliders put it.
        const ray = new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0))
        const material = new MeshBasicMaterial
        try {
          expect(ray.intersectObject(new Mesh(chair.upholstery, material))[0].point.y).toBeCloseTo(seatHeight, 2)
        } finally {
          material.dispose()
        }
      } finally {
        chair.dispose()
      }
    }
  })
})
describe('feast table physics', () => {
  test('colliders match the visible top, seats and tableware, and leave the walkways and the floor under the top free', () => {
    const world = new RAPIER.World({
      x: 0,
      y: 0,
      z: 0,
    })
    try {
      for (const collider of feastColliders()) {
        const description = collider.shape === 'cuboid' ? RAPIER.ColliderDesc.cuboid(...collider.halfExtents) : RAPIER.ColliderDesc.cylinder(collider.halfHeight, collider.radius)
        const rotation = {
          x: 0,
          y: Math.sin(collider.yaw / 2),
          z: 0,
          w: Math.cos(collider.yaw / 2),
        }
        world.createCollider(description.setTranslation(...collider.position).setRotation(rotation))
      }
      world.step()
      const down = (x: number, z: number) => world.castRay(new RAPIER.Ray({
        x,
        y: 3,
        z,
      }, {
        x: 0,
        y: -1,
        z: 0,
      }), 3, true)
      const heightAt = (x: number, z: number) => {
        const hit = down(x, z)
        return hit ? 3 - hit.timeOfImpact : null
      }
      expect(heightAt(0.4, 0.2)).toBeCloseTo(feastTable.height, 5)
      expect(heightAt(0, 5.5)).toBeCloseTo(feastTable.height, 5)
      for (const seat of feastSeats) {
        expect(heightAt(seat.position[0], seat.position[2])).toBeCloseTo(seatDimensions[seat.kind].seatHeight, 5)
        const setting = placeSetting(seat)
        expect(heightAt(setting.position[0], setting.position[2])).toBeCloseTo(setting.position[1] + tableware.plate.height, 5)
      }
      for (const piece of feastCenterpieces) {
        expect(heightAt(0, piece.z)).toBeCloseTo(centerpieceY + tableware[piece.kind].height, 5)
      }
      // Clear walkways beside the chairs and beyond the head chairs.
      expect(heightAt(1.6, 0)).toBeNull()
      expect(heightAt(0, feastTableFrame.halfLength + 1.2)).toBeNull()
      // Under the top, a dropped prop can roll between the legs.
      const under = world.castRay(new RAPIER.Ray({
        x: 0,
        y: 0.4,
        z: -feastTableFrame.halfLength,
      }, {
        x: 0,
        y: 0,
        z: 1,
      }), feastTable.length, true)
      expect(under).toBeNull()
    } finally {
      world.free()
    }
  })
})
describe('feast table materials', () => {
  test('mahogany is a recolored walnut, and disposal spares the shared gold and steel', () => {
    const wood = new WalnutMaterial({colors: mahogany})
    expect(wood.colorNode).not.toBeNull()
    wood.dispose()
    const materials = new FeastTableMaterials
    let goldDisposed = false
    let steelDisposed = false
    const onGold = () => {
      goldDisposed = true
    }
    const onSteel = () => {
      steelDisposed = true
    }
    gold.addEventListener('dispose', onGold)
    metal.addEventListener('dispose', onSteel)
    try {
      for (const slot of ['wood', 'upholstery', 'gold', 'porcelain', 'steel', 'wax', 'flame', 'fruit'] as const) {
        expect(materials[slot]).toBeDefined()
      }
      expect(materials.gold).toBe(gold)
      expect(materials.steel).toBe(metal)
      expect(materials.runner.colorNode).not.toBeNull()
      expect(materials.upholstery.sheenNode).not.toBeNull()
      materials.dispose()
      expect(goldDisposed).toBe(false)
      expect(steelDisposed).toBe(false)
    } finally {
      gold.removeEventListener('dispose', onGold)
      metal.removeEventListener('dispose', onSteel)
    }
  })
  test('every run’s material slot has a material, and the component tags every mesh as Dine’s', async () => {
    const materials = new FeastTableMaterials
    try {
      for (const segment of segments) {
        for (const {slot} of segment.parts) {
          expect(materials[slot]).toBeDefined()
        }
      }
    } finally {
      materials.dispose()
    }
    const component = await Bun.file(new URL('../../src/components/levels/gallery/FeastTable/index.tsx', import.meta.url)).text()
    const meshes = component.match(/<mesh [^>]*>/gu)!
    expect(meshes.length).toBeGreaterThanOrEqual(4)
    expect(meshes.every(mesh => mesh.includes('userData={inDine}'))).toBe(true)
    const culling = await Bun.file(new URL('../../src/components/levels/gallery/RoomCulling/index.tsx', import.meta.url)).text()
    expect(culling).toContain('userData as {room?: RoomId}).room')
    const architecture = await Bun.file(new URL('../../src/components/levels/gallery/Architecture/index.tsx', import.meta.url)).text()
    expect(architecture).toContain('<FeastTable />')
  })
})
