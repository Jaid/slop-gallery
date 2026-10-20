import type {BufferGeometry} from 'three/webgpu'

import {afterAll, describe, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallTop} from '../../src/lib/gallery/architecture.ts'
import ArcSlabGeometry from '../../src/lib/gallery/ArcSlabGeometry.ts'
import LobbyChandelierGeometry, {lobbyChandelier, lobbyChandelierBottom, turned} from '../../src/lib/gallery/LobbyChandelierGeometry.ts'
import lobbyVault, {cofferFrameAngles, glazingStart, lobbyChandeliers, vaultBays, vaultHeight, vaultRibs} from '../../src/lib/gallery/lobbyVault.ts'
import LobbyVaultGeometry, {lobbyVaultCollision, roseCenterY} from '../../src/lib/gallery/LobbyVaultGeometry.ts'
import sun, {sunClearance, sunlitPoints} from '../../src/lib/gallery/sun.ts'
import walls, {insideGallery, roomAt, roomClearHeight, rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import proceduralSky from '../../src/lib/materials/ProceduralSky.ts'
import StainedGlassMaterial from '../../src/lib/materials/StainedGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const halfWidth = room.size[0] / 2
const halfDepth = room.size[1] / 2
const geometry = new LobbyVaultGeometry
const chandelier = new LobbyChandelierGeometry(lobbyChandeliers.anchorY - lobbyChandeliers.y)
const material = new MeshBasicMaterial({side: DoubleSide})
afterAll(() => {
  geometry.dispose()
  chandelier.dispose()
  material.dispose()
})
const key = (vector: Vector3) => [vector.x, vector.y, vector.z].map(value => Math.round(value * 1e5)).join(':')
const point = (attribute: ReturnType<BufferGeometry['getAttribute']>, index: number) => new Vector3(attribute.getX(index), attribute.getY(index), attribute.getZ(index))
/** Every triangle has area, faces along its shading normals and every edge is shared by exactly two triangles. */
const expectClosedAndOutward = (part: BufferGeometry) => {
  const positions = part.getAttribute('position')
  const normals = part.getAttribute('normal')
  const indices = part.index!
  const edges = new Map<string, number>
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
    const [a, b, c] = ids.map(index => point(positions, index))
    const face = b.clone().sub(a).cross(c.clone().sub(a))
    expect(face.length()).toBeGreaterThan(1e-10)
    const shading = ids.reduce((sum, index) => sum.add(point(normals, index)), new Vector3).normalize()
    expect(face.normalize().dot(shading)).toBeGreaterThan(0.9)
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const edge = [key(from), key(to)].toSorted().join('/')
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  expect(edges.values().every(count => count === 2)).toBe(true)
}
describe('the Lobby’s barrel vault', () => {
  test('springs from the wall faces above an attic storey and is far higher than the old ceiling', () => {
    expect(lobbyVault.radius).toBeCloseTo(halfWidth - 0.105, 9)
    expect(lobbyVault.atticBottom).toBe(wallTop)
    expect(lobbyVault.springY).toBeGreaterThan(wallTop + 3)
    expect(lobbyVault.crownY).toBeGreaterThan(2.5 * 5.8)
    expect(vaultHeight(0)).toBeCloseTo(lobbyVault.crownY, 9)
    expect(vaultHeight(lobbyVault.radius)).toBeCloseTo(lobbyVault.springY, 9)
    expect(roomClearHeight(room)).toBeGreaterThan(lobbyVault.crownY)
    // The space under the vault still counts as the Lobby, so room culling keeps the chandeliers and the vault drawn.
    expect(roomAt([0, lobbyVault.crownY - 1, room.center[1]])).toBe('lobby')
    expect(insideGallery([0, lobbyVault.crownY - 1, room.center[1]])).toBe(true)
    // Every other room keeps its flat ceiling.
    expect(rooms.filter(other => other.id !== 'lobby').every(other => roomClearHeight(other) === other.height)).toBe(true)
  })
  test('ribs stand on the 4 m grid of the floor tiles, with wall arches against both end walls', () => {
    const ribs = vaultRibs()
    expect(ribs[0].wallArch).toBe(true)
    expect(ribs.at(-1)!.wallArch).toBe(true)
    const inner = ribs.filter(rib => !rib.wallArch)
    expect(inner.map(rib => rib.z)).toEqual([-16, -12, -8, -4, 0, 4, 8, 12, 16])
    expect(ribs[0].z - lobbyVault.rib.width / 2).toBeCloseTo(-lobbyVault.halfLength, 9)
    expect(ribs.at(-1)!.z + lobbyVault.rib.width / 2).toBeCloseTo(lobbyVault.halfLength, 9)
    for (const [north, south] of vaultBays()) {
      expect(south - north).toBeGreaterThan(lobbyVault.rib.width)
    }
    expect(vaultBays()).toHaveLength(ribs.length - 1)
  })
  test('coffer rows climb from the springing to the glazed crown band', () => {
    const angles = cofferFrameAngles()
    expect(angles[0]).toBe(0)
    expect(angles.at(-1)).toBeCloseTo(glazingStart, 12)
    expect(angles).toHaveLength(lobbyVault.coffer.rows + 1)
    expect(glazingStart).toBeGreaterThan(Math.PI / 4)
    expect(glazingStart).toBeLessThan(Math.PI / 2)
  })
  test('stays within the Lobby’s footprint and above its walls', () => {
    for (const part of [geometry.clad, geometry.trim, geometry.stone, geometry.plaster, geometry.gold, geometry.bars, geometry.glass, geometry.roseGlass]) {
      const box = part.boundingBox!
      expect(box.min.x).toBeGreaterThanOrEqual(-halfWidth - lobbyVault.shell - 0.25)
      expect(box.max.x).toBeLessThanOrEqual(halfWidth + lobbyVault.shell + 0.25)
      // The lunettes sit on top of the end walls, whose outer faces are half a wall behind the room’s edge.
      expect(box.min.z).toBeGreaterThanOrEqual(-halfDepth - 0.35)
      expect(box.max.z).toBeLessThanOrEqual(halfDepth + 0.35)
      // Only the pilaster bases reach down onto the cornice.
      expect(box.min.y).toBeGreaterThanOrEqual(lobbyVault.corniceTop - 1e-6)
      expect(box.max.y).toBeLessThanOrEqual(lobbyVault.crownY + lobbyVault.coffer.depth + lobbyVault.shell + 1e-6)
    }
  })
  test('glass of the crown band spans every bay between the ribs', () => {
    const box = geometry.glass.boundingBox!
    expect(box.min.y).toBeCloseTo(lobbyVault.springY + (lobbyVault.radius + lobbyVault.coffer.depth) * Math.sin(glazingStart), 2)
    expect(box.max.x).toBeCloseTo((lobbyVault.radius + lobbyVault.coffer.depth + 0.02) * Math.cos(glazingStart), 2)
    expect(roseCenterY + lobbyVault.rose.radius).toBeLessThan(vaultHeight(lobbyVault.rose.radius))
    expect(roseCenterY - lobbyVault.rose.radius).toBeGreaterThan(lobbyVault.springY)
  })
  test('keeps a reasonable triangle budget', () => {
    const total = [geometry.clad, geometry.trim, geometry.stone, geometry.plaster, geometry.gold, geometry.bars, geometry.glass, geometry.roseGlass].reduce((sum, part) => sum + triangleCount(part), 0)
    expect(total).toBeLessThan(150_000)
  })
  test('lets the sun in through the glazed crown and nowhere else', () => {
    const meshes = [geometry.clad, geometry.trim, geometry.stone, geometry.plaster, geometry.gold, geometry.bars, geometry.roseGlass].map(part => new Mesh(part, material))
    const glass = new Mesh(geometry.glass, material)
    for (const mesh of [...meshes, glass]) {
      mesh.updateMatrixWorld()
    }
    const direction = new Vector3(...sun.direction)
    let lit = 0
    let total = 0
    for (let x = -7; x <= 7; x += 1) {
      for (let z = -18; z <= 18; z += 1) {
        const origin = new Vector3(x, 0.1, z)
        // Rays that leave through the walls below the springing are the walls’ business.
        const springing = origin.clone().addScaledVector(direction, (lobbyVault.springY - origin.y) / direction.y)
        if (Math.abs(springing.x) > lobbyVault.radius || Math.abs(springing.z) > lobbyVault.halfLength) {
          continue
        }
        const raycaster = new Raycaster(origin, direction)
        const blocked = raycaster.intersectObjects(meshes, false).at(0)
        const pane = raycaster.intersectObject(glass, false).at(0)
        total++
        // Light that misses the glass meets the shell of the vault; nothing reaches the floor through a gap.
        expect(blocked ?? pane).toBeDefined()
        if (pane && (!blocked || blocked.distance > pane.distance)) {
          lit++
        }
      }
    }
    // A broad band of sunlight falls on the floor, but bars, ribs and the solid flanks keep most of it in the shade.
    expect(lit / total).toBeGreaterThan(0.15)
    expect(lit / total).toBeLessThan(0.75)
  })
  test('arc slabs are closed, outward-wound solids, from thin shells to narrow ribs and full rings', () => {
    for (const options of [
      {
        radii: [7.9, 8.4],
        angles: [0, Math.PI],
        z: [-0.3, 0.3],
      },
      {
        radii: [0, 2],
        angles: [0, Math.PI * 2],
        z: [0, 0.02],
        segments: 24,
      },
      {
        radii: [1, 1.2],
        angles: [0.2, 0.3],
        z: [0, 4],
        segments: 1,
      },
    ] as const) {
      const slab = new ArcSlabGeometry(options)
      expectClosedAndOutward(slab)
      slab.dispose()
    }
    expect(() => new ArcSlabGeometry({
      radii: [2, 1],
      angles: [0, 1],
      z: [0, 1],
    })).toThrow(RangeError)
  })
  test('a smooth collision shell lines the vault', () => {
    const [vertices, indices] = lobbyVaultCollision()
    expect(indices.length % 3).toBe(0)
    expect(indices.length).toBeGreaterThan(0)
    for (let i = 0; i < vertices.length; i += 3) {
      expect(Math.hypot(vertices[i], vertices[i + 1] - lobbyVault.springY)).toBeGreaterThanOrEqual(lobbyVault.radius - 1e-4)
    }
  })
})
describe('the Lobby’s chandeliers', () => {
  test('hang from the crowns of the ribs, high above the visitors and clear of each other', () => {
    const ribs = vaultRibs().map(rib => rib.z)
    for (const z of lobbyChandeliers.offsets) {
      expect(ribs).toContain(z)
    }
    expect(lobbyChandeliers.anchorY).toBeCloseTo(lobbyVault.crownY - lobbyVault.rib.depth, 9)
    expect(lobbyChandeliers.y + lobbyChandelierBottom).toBeGreaterThan(7)
    const reach = Math.max(...lobbyChandelier.tiers.map(tier => tier.reach))
    const offsets = lobbyChandeliers.offsets
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i] - offsets[i - 1]).toBeGreaterThan(reach * 2 + 2)
    }
    expect(lobbyChandeliers.offsets).toContain(lobbyChandeliers.shadowCaster)
    // The canopy meets the rib soffit.
    expect(chandelier.gilt.boundingBox!.max.y).toBeCloseTo(lobbyChandeliers.anchorY - lobbyChandeliers.y, 6)
    expect(chandelier.crystal.boundingBox!.min.y).toBeGreaterThanOrEqual(lobbyChandelierBottom - 1e-6)
    // Its light sits below the whole fixture.
    expect(lobbyChandelier.lightY).toBeLessThan(lobbyChandelierBottom)
  })
  test('turned parts face outward', () => {
    // Listed top to bottom like the column’s profile: a capsule-like drum, closed at both ends on the axis.
    const part = turned([[0, 0], [0.1, -0.1], [0.1, -0.9], [0, -1]], 12)
    const positions = part.getAttribute('position')
    const normals = part.getAttribute('normal')
    let measured = 0
    for (let i = 0; i < positions.count; i++) {
      const horizontal = Math.hypot(positions.getX(i), positions.getZ(i))
      const y = positions.getY(i)
      if (!(horizontal > 0.09 && y < -0.05 && y > -0.95)) {
        continue
      }
      measured++
      expect((positions.getX(i) * normals.getX(i) + positions.getZ(i) * normals.getZ(i)) / horizontal).toBeGreaterThan(0.5)
    }
    expect(measured).toBeGreaterThan(0)
    // Triangles wind the same way as their normals.
    const indices = part.index!
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
      const [a, b, c] = ids.map(index => point(positions, index))
      const face = b.clone().sub(a).cross(c.clone().sub(a))
      if (face.length() < 1e-9) {
        continue
      }
      const shading = ids.reduce((sum, index) => sum.add(point(normals, index)), new Vector3)
      expect(face.dot(shading)).toBeGreaterThan(0)
    }
    part.dispose()
  })
  test('replace the old lamps: the Lobby keeps no flat ceiling, laylights or light boxes', async () => {
    const architecture = await Bun.file(new URL('../../src/components/levels/gallery/Architecture/index.tsx', import.meta.url)).text()
    expect(architecture).toContain('<LobbyVault')
    expect(architecture).not.toContain('LobbyCeiling')
    expect(architecture).toMatch(/vaultedRooms\.has\(room\.id\) \|\| |\|\| vaultedRooms\.has\(room\.id\)/u)
    expect(await Bun.file(new URL('../../src/lib/gallery/lobbyCeiling.ts', import.meta.url)).exists()).toBe(false)
  })
})
describe('the sun and the sky', () => {
  test('the shadow map covers every sunlit room, and the vault stays in front of its near plane', () => {
    const direction = new Vector3(...sun.direction)
    expect(direction.length()).toBeCloseTo(1, 9)
    expect(direction.y).toBeGreaterThan(0.8)
    const position = new Vector3(...sun.position)
    const forward = direction.clone().negate()
    const worldUp = new Vector3(0, 1, 0)
    const right = worldUp.cross(direction).normalize()
    const up = direction.clone().cross(right)
    for (const corner of sunlitPoints()) {
      const offset = new Vector3(...corner)
      offset.sub(position)
      expect(offset.dot(right)).toBeGreaterThan(sun.shadow.left)
      expect(offset.dot(right)).toBeLessThan(sun.shadow.right)
      expect(offset.dot(up)).toBeGreaterThan(sun.shadow.bottom)
      expect(offset.dot(up)).toBeLessThan(sun.shadow.top)
      expect(offset.dot(forward)).toBeGreaterThan(sun.shadow.near)
      expect(offset.dot(forward)).toBeLessThan(sun.shadow.far)
    }
    expect(sunClearance).toBeGreaterThan(sun.shadow.near)
    expect(sunlitPoints().some(([x, y, z]) => Math.abs(x) < 9 && y > lobbyVault.crownY && Math.abs(z - room.center[1]) < 21)).toBe(true)
  })
  test('the sky and the stained glass validate their options', () => {
    expect(() => proceduralSky({sunDirection: sun.direction})).not.toThrow()
    expect(() => proceduralSky({
      sunDirection: sun.direction,
      cloudCover: 1.5,
    })).toThrow(RangeError)
    expect(() => proceduralSky({sunDirection: [0, 0, 0]})).toThrow(RangeError)
    const options = {
      center: [0, roseCenterY],
      radius: lobbyVault.rose.radius - lobbyVault.rose.ring,
      hub: lobbyVault.rose.hub,
      foil: lobbyVault.rose.foil,
      spokes: lobbyVault.rose.spokes,
    } as const
    const glass = new StainedGlassMaterial(options)
    expect(glass.colorNode).toBeTruthy()
    glass.dispose()
    expect(() => new StainedGlassMaterial({
      ...options,
      hub: options.radius * 2,
    })).toThrow(RangeError)
    expect(() => new StainedGlassMaterial({
      ...options,
      brightness: 2,
    })).toThrow(RangeError)
  })
  test('the end walls stop below the attic, which carries their cladding on up to the vault', () => {
    for (const wall of walls) {
      if (wall.room === 'lobby') {
        expect(wall.height + 0.3).toBeCloseTo(lobbyVault.atticBottom, 9)
      }
    }
  })
})
