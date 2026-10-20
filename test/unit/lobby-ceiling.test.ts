import {afterAll, describe, expect, test} from 'bun:test'

import {Box3, DoubleSide, Mesh, MeshBasicNodeMaterial, PointLight, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import ceiling, {lobbyBays, lobbyChandeliers, lobbyRibs, lobbyVaultHeight} from '../../src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry, {vaultSector} from '../../src/lib/gallery/LobbyCeilingGeometry.ts'
import LobbyChandelierGeometry from '../../src/lib/gallery/LobbyChandelierGeometry.ts'
import walls, {insideGallery, rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import ClearGlassMaterial from '../../src/lib/materials/ClearGlassMaterial.ts'
import DaylightSkyMaterial, {gallerySunDirection} from '../../src/lib/materials/DaylightSkyMaterial.ts'
import ChandelierLightsNode from '../../src/lib/materials/lights/ChandelierLightsNode.ts'

const roof = new LobbyCeilingGeometry
const fixture = new LobbyChandelierGeometry
const material = new MeshBasicNodeMaterial({side: DoubleSide})
const hit = (geometry: typeof roof.glass, origin: Vector3, direction: Vector3) => {
  const mesh = new Mesh(geometry, material)
  mesh.updateMatrixWorld(true)
  const ray = new Raycaster(origin, direction.normalize())
  return ray.intersectObject(mesh)[0]
}
afterAll(() => {
  roof.dispose()
  fixture.dispose()
  material.dispose()
})
const bounds = (geometry: typeof roof.glass) => {
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}
describe('the Lobby’s cathedral vault', () => {
  test('the round ceiling rises to 16 m, without moving the lower walls, entrance or artwork coordinates', () => {
    const room = rooms.find(candidate => candidate.id === 'lobby')!
    expect(room.height).toBe(16)
    expect(lobbyVaultHeight(0)).toBe(16)
    expect(lobbyVaultHeight(8)).toBe(8)
    expect(lobbyVaultHeight(-4)).toBe(lobbyVaultHeight(4))
    for (const wall of walls) {
      if (wall.room !== 'lobby') {
        continue
      }
      expect(wall.height).toBe(5.5)
      expect(wall.center[1]).toBe(0)
    }
    expect(insideGallery([0, 14, lobby.northZ + 2])).toBe(true)
    expect(insideGallery([7.5, 14, lobby.northZ + 2])).toBe(false)
    expect(insideGallery([0, 17, lobby.northZ + 2])).toBe(false)
    expect(rooms.find(candidate => candidate.id === 'dine')!.height).toBe(5.8)
  })
  test('bays fill the original footprint, with three large chandeliers safely above the walking space', () => {
    expect(lobbyRibs.at(0)).toBe(-ceiling.halfDepth)
    expect(lobbyRibs.at(-1)).toBe(ceiling.halfDepth)
    expect(lobbyBays.reduce((sum, bay) => sum + bay.end - bay.start, 0)).toBeCloseTo(lobby.southZ - lobby.northZ, 9)
    expect(lobbyChandeliers.offsets).toHaveLength(3)
    for (const z of lobbyChandeliers.offsets) {
      expect(Math.abs(z) + lobbyChandeliers.radius).toBeLessThan(ceiling.halfDepth)
      expect(lobbyRibs.some(rib => Math.abs(z - rib) < 1e-6)).toBe(true)
    }
    expect(bounds(fixture.crystals).min.y + lobbyChandeliers.y).toBeGreaterThan(5.5)
    expect(bounds(fixture.metal).max.x).toBeGreaterThan(1.8)
    expect(bounds(fixture.suspension).max.y + lobbyChandeliers.y).toBeCloseTo(ceiling.crown - 0.25, 4)
  })
  test('the skylights are real holes in the roof, closed only by glass', () => {
    for (const bay of lobbyBays) {
      const origin = new Vector3(0.3, 6, bay.center + 0.3)
      const direction = new Vector3(0, 1, 0)
      expect(hit(roof.plaster, origin, direction)).toBeUndefined()
      expect(hit(roof.ribs, origin, direction)).toBeUndefined()
      const pane = hit(roof.glass, origin, direction)
      expect(pane).toBeDefined()
      expect(pane.point.y).toBeGreaterThan(15.9)
      // The old 5.7 m slab cannot block either side of the vault.
      const side = hit(roof.plaster, new Vector3(5, 5.8, bay.center + 0.7), direction)
      expect(side.point.y).toBeCloseTo(lobbyVaultHeight(5), 2)
    }
  })
  test('sunlight passes through the glazed crown, but the opaque flank still shades the floor', () => {
    const lit = new Vector3(5, 1, 1.5)
    const shaded = new Vector3(-5, 1, 1.5)
    expect(hit(roof.glass, lit, gallerySunDirection)).toBeDefined()
    expect(hit(roof.plaster, lit, gallerySunDirection)).toBeUndefined()
    expect(hit(roof.ribs, lit, gallerySunDirection)).toBeUndefined()
    expect(hit(roof.plaster, shaded, gallerySunDirection)).toBeDefined()
  })
  test('both rose windows and all twelve clerestory windows have unobstructed glass apertures', () => {
    for (const side of [-1, 1]) {
      const direction = new Vector3(0, 0, side)
      const origin = new Vector3(0.7, ceiling.rose.y + 0.2, side * (ceiling.halfDepth - 1))
      expect(hit(roof.plaster, origin, direction)).toBeUndefined()
      expect(hit(roof.glass, origin, direction)).toBeDefined()
      const stone = hit(roof.plaster, new Vector3(3, ceiling.rose.y, side * (ceiling.halfDepth - 1)), direction)
      expect(stone).toBeDefined()
      for (const bay of lobbyBays) {
        const windowOrigin = new Vector3(side * 7, 6.7, bay.center + 0.2)
        const outward = new Vector3(side, 0, 0)
        expect(hit(roof.plaster, windowOrigin, outward)).toBeUndefined()
        expect(hit(roof.glass, windowOrigin, outward)).toBeDefined()
      }
    }
  })
  test('the solid vault has inward-facing analytic normals and outward triangle winding', () => {
    const sector = vaultSector(0.2, 1.1, 8.1, 0.2, 3, 0)
    try {
      const mesh = new Mesh(sector, new MeshBasicNodeMaterial)
      mesh.updateMatrixWorld(true)
      const angle = 0.7
      const direction = new Vector3(Math.cos(angle), Math.sin(angle), 0)
      const ray = new Raycaster(new Vector3(0, ceiling.spring, 0), direction)
      const surface = ray.intersectObject(mesh)[0]
      expect(surface).toBeDefined()
      expect(surface.distance).toBeCloseTo(8, 2)
      expect(surface.normal!.dot(direction)).toBeLessThan(-0.999)
      mesh.material.dispose()
    } finally {
      sector.dispose()
    }
  })
  test('all geometry is finite and bounded, with a fixed triangle budget and matching welded collision', () => {
    let triangles = 0
    for (const part of [roof.plaster, roof.ribs, roof.gold, roof.bars, roof.glass, fixture.metal, fixture.candles, fixture.crystals, fixture.flames, fixture.suspension]) {
      expect(part.getAttribute('position').array.every(Number.isFinite)).toBe(true)
      expect(part.getAttribute('normal').array.every(Number.isFinite)).toBe(true)
      const normals = part.getAttribute('normal')
      for (let i = 0; i < normals.count; i++) {
        expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 4)
      }
      triangles += triangleCount(part)
    }
    expect(triangles).toBeLessThan(230_000)
    const full = new Box3
    for (const part of [roof.plaster, roof.ribs, roof.gold, roof.bars, roof.glass]) {
      full.union(bounds(part))
    }
    expect(full.min.y).toBeGreaterThanOrEqual(5.49)
    expect(full.max.y).toBeLessThanOrEqual(16.23)
    expect(Math.max(Math.abs(full.min.x), Math.abs(full.max.x))).toBeLessThan(8.5)
    for (const part of [roof.plaster, roof.ribs, roof.glass, fixture.metal, fixture.suspension]) {
      const [vertices, indices] = colliderGeometry(part)
      expect(vertices.every(Number.isFinite)).toBe(true)
      expect(indices.length).toBeGreaterThan(0)
      expect(indices.every(index => index < vertices.length / 3)).toBe(true)
      expect(Math.max(...vertices.filter((_, i) => i % 3 === 1))).toBeCloseTo(bounds(part).max.y, 5)
    }
  })
  test('aggregate candle lights illuminate the room without bleaching the fixture itself', () => {
    const lights = new ChandelierLightsNode
    const aggregate = new PointLight
    aggregate.userData = lights.lampUserData()
    const ordinary = new PointLight
    const fixtureMaterial = new ClearGlassMaterial({
      absorption: 0.02,
      ior: 1.52,
      name: 'fixture-test',
    })
    try {
      expect(lights.admits(aggregate)).toBe(false)
      expect(lights.admits(ordinary)).toBe(true)
      expect(lights.adopt(fixtureMaterial).lightsNode).toBe(lights)
    } finally {
      aggregate.dispose()
      ordinary.dispose()
      fixtureMaterial.dispose()
    }
  })
  test('the clear glass transmits a backdrop, and the procedural sun shares the daylight direction', () => {
    const glass = new ClearGlassMaterial({
      absorption: 0.025,
      ior: 1.52,
      name: 'test-vault',
    })
    const sky = new DaylightSkyMaterial
    try {
      expect(glass.transparent).toBe(true)
      expect(glass.depthWrite).toBe(false)
      expect(glass.opacityNode?.isNode).toBe(true)
      expect(sky.colorNode?.isNode).toBe(true)
      expect(sky.map).toBeNull()
      expect(sky.depthWrite).toBe(false)
      expect(gallerySunDirection.length()).toBeCloseTo(1)
      expect(gallerySunDirection.y).toBeGreaterThan(0.7)
    } finally {
      glass.dispose()
      sky.dispose()
    }
  })
})
