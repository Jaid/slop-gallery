import {describe, expect, test} from 'bun:test'

import {Vector3} from 'three/webgpu'

import {wallTop} from '../../src/lib/gallery/architecture.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import lobbyCeiling, {lobbyChandelierHeight, lobbyChandeliers, lobbyVaultBays, lobbyVaultBands, lobbyVaultCenterY, lobbyVaultRadius, lobbyVaultRibs, vaultBarOffsets, vaultPoint} from '../../src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '../../src/lib/gallery/LobbyCeilingGeometry.ts'
import VaultChandelierGeometry from '../../src/lib/gallery/VaultChandelierGeometry.ts'
import walls, {rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import DaylightSkyMaterial from '../../src/lib/materials/DaylightSkyMaterial.ts'
import VaultGlassMaterial from '../../src/lib/materials/VaultGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const halfWidth = lobby.width / 2
const halfDepth = (lobby.southZ - lobby.northZ) / 2
const lobbyWalls = walls.filter(wall => wall.room === 'lobby')
/** Top of the cornice’s upper band, as built by the wall geometry. */
const corniceTop = Math.max(...lobbyWalls.map(wall => wall.height)) - 0.22 + 0.23 / 2
const center = new Vector3(0, lobbyVaultCenterY, 0)

describe('the Lobby’s barrel vault', () => {
  test('the vault is a semicircle springing above the cornice and rising well past the old flat ceiling', () => {
    expect(lobbyCeiling.spring).toBeGreaterThan(corniceTop)
    expect(lobbyCeiling.spring).toBeLessThan(wallTop)
    expect(lobbyVaultRadius).toBeCloseTo(halfWidth, 9)
    expect(lobbyCeiling.crown - lobbyCeiling.spring).toBeCloseTo(lobbyVaultRadius, 9)
    expect(lobbyCeiling.crown).toBeGreaterThan(wallTop + 6)
    expect(room.ceiling).toBeGreaterThan(lobbyCeiling.crown)
    const spring = vaultPoint(-Math.PI / 2, 0)
    const crown = vaultPoint(0, 0)
    expect(spring[0]).toBeCloseTo(-halfWidth, 6)
    expect(spring[1]).toBeCloseTo(lobbyCeiling.spring, 6)
    expect(crown[1]).toBeCloseTo(lobbyCeiling.crown, 6)
    expect(crown[0]).toBeCloseTo(0, 6)
  })
  test('three glazed bays run the length of the room between four ribs, with solid bands at the springing and the crown open', () => {
    const bands = lobbyVaultBands()
    expect(bands).toHaveLength(lobbyCeiling.bands)
    expect(bands.filter(band => band.glazed)).toHaveLength(lobbyCeiling.bands - 8)
    expect(bands[0].glazed).toBe(false)
    expect(bands[1].glazed).toBe(false)
    expect(bands.at(-1)!.glazed).toBe(false)
    expect(bands[lobbyCeiling.bands / 2].glazed).toBe(true)
    const ribs = lobbyVaultRibs()
    expect(ribs).toHaveLength(lobbyCeiling.ribs)
    expect(ribs[0].z).toBeCloseTo(-halfDepth, 6)
    expect(ribs.at(-1)!.z).toBeCloseTo(halfDepth, 6)
    const bays = lobbyVaultBays()
    expect(bays).toHaveLength(lobbyCeiling.ribs - 1)
    for (const bay of bays) {
      expect(bay.field.size[0]).toBeGreaterThan(halfWidth)
      expect(bay.field.size[1]).toBeGreaterThan(8)
      expect(Math.abs(bay.center[0])).toBeLessThan(1e-6)
    }
  })
  test('every glazed bay holds a whole grid of panes, so the bars meet the frame', () => {
    for (const bay of lobbyVaultBays()) {
      const [across, along] = lobbyCeiling.panes
      const xBars = vaultBarOffsets(bay.field.size[0], across)
      const zBars = vaultBarOffsets(bay.field.size[1], along)
      expect(xBars).toHaveLength(across - 1)
      expect(zBars).toHaveLength(along - 1)
      expect(xBars.every(offset => Math.abs(offset) < bay.field.size[0] / 2 - lobbyCeiling.bar.rim)).toBe(true)
      expect(zBars.every(offset => Math.abs(offset) < bay.field.size[1] / 2 - lobbyCeiling.bar.rim)).toBe(true)
    }
    expect(() => vaultBarOffsets(4, 1.5)).toThrow(RangeError)
  })
  test('the chandeliers hang from the ribs between the bays, clear of the shell and the springing', () => {
    expect(lobbyChandeliers.zs).toHaveLength(lobbyCeiling.ribs - 2)
    const ribs = lobbyVaultRibs().map(rib => rib.z)
    for (const z of lobbyChandeliers.zs) {
      expect(ribs.some(rib => Math.abs(rib - z) < 1e-6)).toBe(true)
      expect(Math.abs(z)).toBeLessThan(halfDepth)
    }
    const hub = lobbyChandelierHeight()
    expect(hub).toBeGreaterThan(lobbyCeiling.spring + 2)
    expect(hub).toBeLessThan(lobbyCeiling.crown - 2)
    expect(lobbyChandeliers.shadowIndex).toBeGreaterThanOrEqual(0)
    expect(lobbyChandeliers.shadowIndex).toBeLessThan(lobbyChandeliers.zs.length)
  })
  test('the vault geometry faces the room, stays inside it and is finite', () => {
    const geometry = new LobbyCeilingGeometry
    try {
      for (const part of [geometry.plaster, geometry.bars, geometry.glass]) {
        const positions = part.getAttribute('position')
        expect([...positions.array].every(Number.isFinite)).toBe(true)
        part.computeBoundingBox()
        const box = part.boundingBox!
        expect(box.min.x).toBeGreaterThanOrEqual(-halfWidth - 0.2)
        expect(box.max.x).toBeLessThanOrEqual(halfWidth + 0.2)
        expect(box.min.z).toBeGreaterThanOrEqual(-halfDepth - 0.4)
        expect(box.max.z).toBeLessThanOrEqual(halfDepth + 0.4)
        expect(box.min.y).toBeGreaterThanOrEqual(lobbyCeiling.spring - 0.05)
        expect(box.max.y).toBeLessThanOrEqual(lobbyCeiling.crown + lobbyCeiling.shell + 0.05)
      }
      const normals = geometry.glass.getAttribute('normal')
      const positions = geometry.glass.getAttribute('position')
      const normal = new Vector3
      const point = new Vector3
      for (let index = 0; index < normals.count; index++) {
        normal.fromBufferAttribute(normals, index)
        point.fromBufferAttribute(positions, index)
        expect(normal.dot(center.clone().sub(point))).toBeGreaterThan(0)
      }
      const triangles = triangleCount(geometry.plaster) + triangleCount(geometry.bars) + triangleCount(geometry.glass)
      expect(triangles).toBeLessThan(12_000)
    } finally {
      geometry.dispose()
    }
  })
  test('a chandelier is made of closed round parts and hangs its candles below the hub', () => {
    const chandelier = new VaultChandelierGeometry
    try {
      for (const part of [chandelier.brass, chandelier.candles, chandelier.flames]) {
        expect([...part.getAttribute('position').array].every(Number.isFinite)).toBe(true)
        part.computeBoundingBox()
      }
      const brass = chandelier.brass.boundingBox!
      expect(brass.max.y).toBeGreaterThan(lobbyChandeliers.drop - 0.2)
      expect(brass.min.y).toBeLessThan(0)
      const candles = chandelier.candles.boundingBox!
      expect(candles.max.y).toBeLessThan(0.6)
      expect(candles.min.y).toBeLessThan(-0.6)
      expect(triangleCount(chandelier.brass) + triangleCount(chandelier.candles) + triangleCount(chandelier.flames)).toBeLessThan(8_000)
    } finally {
      chandelier.dispose()
    }
  })
  test('the sky and the vault glass shade the same procedural daylight', () => {
    const sky = new DaylightSkyMaterial
    const glass = new VaultGlassMaterial
    try {
      expect(sky.colorNode?.isNode).toBe(true)
      expect(sky.toneMapped).toBe(false)
      expect(glass.colorNode?.isNode).toBe(true)
      expect(glass.toneMapped).toBe(false)
      expect(glass.transparent).toBe(false)
    } finally {
      sky.dispose()
      glass.dispose()
    }
  })
})
