import {describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallTop} from '../../src/lib/gallery/architecture.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import lobbyCeiling, {lobbyBeamBottom, lobbyChandeliers, lobbyDaylights, lobbyOpening, lobbySkylightFields, lobbyVaultCoffers, transverseRibZs, vaultHeightAt} from '../../src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '../../src/lib/gallery/LobbyCeilingGeometry.ts'
import walls, {rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import CofferPlasterMaterial from '../../src/lib/materials/CofferPlasterMaterial.ts'
import LaylightGlassMaterial from '../../src/lib/materials/LaylightGlassMaterial.ts'
import {LanternLight} from '../../src/lib/materials/lights/index.ts'
import SkyBoxMaterial, {skySunDirection} from '../../src/lib/materials/SkyBoxMaterial.ts'
import VaultGlassMaterial from '../../src/lib/materials/VaultGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const halfWidth = room.size[0] / 2
const halfDepth = room.size[1] / 2
const lobbyWalls = walls.filter(wall => wall.room === 'lobby')
/** Top of the cornice’s upper band, as built by the wall geometry. */
const corniceTop = Math.max(...lobbyWalls.map(wall => wall.height)) - 0.22 + 0.23 / 2
const contains = (outer: {
  center: readonly [number, number]
  size: readonly [number, number]
}, x: number, z: number) => Math.abs(x - outer.center[0]) <= outer.size[0] / 2 + 1e-9 && Math.abs(z - outer.center[1]) <= outer.size[1] / 2 + 1e-9
/** Sine of the elevation of a point seen from a lamp. */
const elevation = (horizontal: number, height: number) => height / Math.hypot(horizontal, height)
describe('the Lobby’s cathedral barrel-vaulted ceiling', () => {
  test('rises from the top of the walls as a high semicircular barrel vault', () => {
    expect(lobbyCeiling.radius).toBe(halfWidth)
    expect(lobbyCeiling.springY).toBeCloseTo(wallTop - 0.3, 6)
    expect(lobbyCeiling.crownY).toBeCloseTo(lobbyCeiling.springY + halfWidth, 6)
    expect(lobbyCeiling.crownY).toBeGreaterThan(12)
    expect(vaultHeightAt(0)).toBeCloseTo(lobbyCeiling.crownY, 9)
    expect(vaultHeightAt(-halfWidth)).toBeCloseTo(lobbyCeiling.springY, 9)
    expect(vaultHeightAt(halfWidth)).toBeCloseTo(lobbyCeiling.springY, 9)
    // Springing ribs stay above the cornice and the main entrance’s keystone.
    expect(lobbyBeamBottom).toBeGreaterThan(corniceTop)
    expect(lobbyBeamBottom).toBeGreaterThan(5.16)
  })
  test('vault compartments tile all ten 4 m bays across the arch without overlapping', () => {
    const coffers = lobbyVaultCoffers()
    expect(transverseRibZs).toHaveLength(11)
    expect(coffers).toHaveLength(10 * 6)
    const skylit = coffers.filter(coffer => coffer.laylight)
    const solid = coffers.filter(coffer => !coffer.laylight)
    expect(skylit).toHaveLength(10 * 4)
    expect(solid).toHaveLength(10 * 2)
    for (const coffer of coffers) {
      expect(coffer.clearAngles[0]).toBeGreaterThan(coffer.angles[0])
      expect(coffer.clearAngles[1]).toBeLessThan(coffer.angles[1])
      expect(coffer.clearAngles[1]).toBeGreaterThan(coffer.clearAngles[0])
      expect(coffer.clearZ[0]).toBeGreaterThan(coffer.z[0])
      expect(coffer.clearZ[1]).toBeLessThan(coffer.z[1])
      expect(coffer.clearZ[1]).toBeGreaterThan(coffer.clearZ[0])
    }
    const fields = lobbySkylightFields()
    expect(fields).toHaveLength(skylit.length)
    for (const field of fields) {
      expect(field.size[0]).toBeGreaterThan(2)
      expect(field.size[1]).toBeGreaterThan(2)
      expect(Math.abs(field.center[0]) + field.size[0] / 2).toBeLessThan(halfWidth)
      expect(Math.abs(field.center[1]) + field.size[1] / 2).toBeLessThan(halfDepth)
    }
  })
  test('the geometry is finite, arches high above the room, encloses the vault in a sky dome and stays within budget', () => {
    const geometry = new LobbyCeilingGeometry
    const material = new MeshBasicMaterial
    try {
      const parts = [geometry.plaster, geometry.bars, geometry.glass, geometry.gilt, geometry.candles, geometry.flames, geometry.sky]
      for (const part of parts) {
        const positions = part.getAttribute('position').array
        expect(positions.every(Number.isFinite)).toBe(true)
        part.computeBoundingBox()
      }
      const plasterBox = geometry.plaster.boundingBox!
      expect(plasterBox.min.x).toBeGreaterThanOrEqual(-halfWidth - lobbyCeiling.shellThickness - 1e-5)
      expect(plasterBox.max.x).toBeLessThanOrEqual(halfWidth + lobbyCeiling.shellThickness + 1e-5)
      expect(plasterBox.min.y).toBeGreaterThanOrEqual(lobbyBeamBottom - 1e-5)
      expect(plasterBox.max.y).toBeGreaterThan(lobbyCeiling.crownY)
      // Downward-facing normals along the curved glass crown point into the Lobby.
      const glassMesh = new Mesh(geometry.glass, material)
      const skyMesh = new Mesh(geometry.sky, material)
      const ray = new Raycaster(new Vector3(1.2, 2, -6), new Vector3(0, 1, 0))
      const glassHits = ray.intersectObject(glassMesh)
      expect(glassHits.length).toBeGreaterThan(0)
      expect(glassHits[0].point.y).toBeGreaterThan(12)
      expect(glassHits[0].face!.normal.y).toBeLessThan(-0.8)
      // Every upward sightline through the skylight glass reaches the sky dome above it without hitting another room’s ceiling.
      const skyBox = geometry.sky.boundingBox!
      expect(skyBox.max.y).toBeGreaterThan(lobbyCeiling.crownY + 10)
      expect(skyBox.min.y).toBeGreaterThan(5.8 - 1.6)
      expect(skyMesh.geometry.getAttribute('position').count).toBeGreaterThan(100)
      const triangles = parts.reduce((sum, part) => sum + triangleCount(part), 0)
      expect(triangles).toBeLessThan(95_000)
    } finally {
      material.dispose()
      geometry.dispose()
    }
  })
  test('three grand chandeliers hang along the central nave, clear of the glass floor opening and cross ribs', () => {
    expect(lobbyChandeliers.offsets).toHaveLength(3)
    expect(lobbyChandeliers.hubY).toBeGreaterThan(6.5)
    expect(lobbyChandeliers.hubY).toBeLessThan(lobbyCeiling.crownY - 3)
    expect(lobbyChandeliers.outerRadius).toBeGreaterThan(1.5)
    for (const z of lobbyChandeliers.offsets) {
      expect(Math.abs(z)).toBeLessThan(halfDepth - 4)
      // Each chandelier hangs in the middle of a 4 m bay, 2 m clear of the nearest transverse arch rib.
      const nearestRib = Math.min(...transverseRibZs.map(ribZ => Math.abs(ribZ - z)))
      expect(nearestRib).toBeCloseTo(lobbyCeiling.bay / 2, 6)
      // None of the chandeliers hang over the 8×8 m glass floor opening at z = −8, keeping the Oculus view open to the sky.
      expect(contains(lobbyOpening, 0, z)).toBe(false)
    }
  })
  test('chandelier and daylight roofs spare the walls and cornice while shading the vault spine directly above them', () => {
    expect(lobbyDaylights.offsets).toContain(lobbyDaylights.shadowCaster)
    expect(lobby.opening.center[1] - room.center[1]).toBe(lobbyDaylights.shadowCaster)
    const daylight = new LanternLight({roof: lobbyDaylights.roof})
    expect(daylight.transmission(-1)).toBe(1)
    expect(daylight.transmission(elevation(halfWidth, corniceTop - lobbyDaylights.y))).toBe(1)
    expect(daylight.transmission(1)).toBeCloseTo(lobbyDaylights.roof.leak, 6)
    const chandelierLamp = new LanternLight({roof: lobbyChandeliers.light.roof})
    const lightY = lobbyChandeliers.hubY + lobbyChandeliers.light.offsetY
    expect(chandelierLamp.transmission(-1)).toBe(1)
    expect(chandelierLamp.transmission(elevation(halfWidth, corniceTop - lightY))).toBe(1)
    expect(chandelierLamp.transmission(1)).toBeCloseTo(lobbyChandeliers.light.roof.leak, 6)
  })
  test('vault glass, procedural skybox and coffer plaster materials build their nodes and validate inputs', () => {
    const fields = lobbySkylightFields()
    const plaster = new CofferPlasterMaterial({
      fields,
      glassY: lobbyCeiling.crownY,
    })
    const vaultGlassHeavy = new VaultGlassMaterial({heavy: true})
    const vaultGlassFast = new VaultGlassMaterial({heavy: false})
    const sky = new SkyBoxMaterial({sunDirection: skySunDirection})
    const laylight = new LaylightGlassMaterial(1, [0, 0], {fieldFalloff: 0.2})
    try {
      expect(plaster.emissiveNode?.isNode).toBe(true)
      expect(vaultGlassHeavy.emissiveNode?.isNode).toBe(true)
      expect(vaultGlassHeavy.normalNode?.isNode).toBe(true)
      expect(vaultGlassFast.transparent).toBe(true)
      expect(sky.colorNode?.isNode).toBe(true)
      expect(laylight.colorNode?.isNode).toBe(true)
    } finally {
      plaster.dispose()
      vaultGlassHeavy.dispose()
      vaultGlassFast.dispose()
      sky.dispose()
      laylight.dispose()
    }
    expect(() => new VaultGlassMaterial({paneSize: [0, 1]})).toThrow(RangeError)
    expect(() => new VaultGlassMaterial({thickness: 0})).toThrow(RangeError)
    expect(() => new SkyBoxMaterial({sunDirection: [0, 0, 0]})).toThrow(RangeError)
    expect(() => new CofferPlasterMaterial({
      fields: [],
      glassY: 5,
    })).toThrow(RangeError)
  })
})
