import {afterAll, describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import lobby from '../../src/lib/gallery/lobby.ts'
import lobbyLunetteRelief, {lunetteInscription, lunetteReliefClearance} from '../../src/lib/gallery/lobbyLunette.ts'
import LobbyLunetteReliefGeometry from '../../src/lib/gallery/LobbyLunetteReliefGeometry.ts'
import lobbyVault from '../../src/lib/gallery/lobbyVault.ts'
import {roseCenterY} from '../../src/lib/gallery/LobbyVaultGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

const geometry = new LobbyLunetteReliefGeometry
const material = new MeshBasicMaterial
const roomCenterZ = (lobby.northZ + lobby.southZ) / 2
afterAll(() => {
  geometry.dispose()
  material.dispose()
})
describe('the relief on the Lobby’s north lunette', () => {
  test('hangs on the axis, clear of the rose window and the cornice and inside the lunette', () => {
    const {aboveRose, belowCrown, insideLunette} = lunetteReliefClearance()
    expect(aboveRose).toBeGreaterThan(0.02)
    expect(belowCrown).toBeGreaterThan(0.15)
    expect(insideLunette).toBeGreaterThan(0.2)
    const box = geometry.gilt.boundingBox!
    expect(box.max.y).toBeLessThan(lobbyVault.crownY)
    expect(box.min.y).toBeGreaterThan(roseCenterY + lobbyVault.rose.radius)
    expect(box.max.x).toBeLessThan(lobbyVault.radius)
  })
  test('stands proud of the lunette toward the room', () => {
    for (const part of [geometry.gilt, geometry.field]) {
      const box = part.boundingBox!
      // The north lunette faces the room along +z, so the carving stands proud that way.
      expect(box.min.z).toBeGreaterThanOrEqual(lobbyLunetteRelief.faceZ - 1e-6)
      expect(box.max.z).toBeLessThan(lobbyLunetteRelief.faceZ + 0.25)
    }
    const box = geometry.gilt.boundingBox!
    // It reads as a tall ornament rather than a thin line.
    expect(box.max.y - box.min.y).toBeGreaterThan(0.6)
  })
  test('letters every character of the gallery’s name, wide enough to read', () => {
    const {advance, gap, letters, text} = lunetteInscription
    for (const character of text) {
      if (character !== ' ') {
        expect(letters).toHaveProperty(character)
      }
    }
    expect(text).toBe('SLOP GALLERY')
    const unit = lobbyLunetteRelief.inscription.stroke
    let width = 0
    for (const character of text) {
      width += (character === ' ' ? gap : advance) * unit
    }
    expect(width).toBeGreaterThan(0.6)
    expect(width).toBeLessThan(lobbyLunetteRelief.panel.width)
  })
  test('covers the pointed-at field: a ray into the bare travertine now meets the carving', () => {
    const mesh = new Mesh(geometry.gilt, material)
    // The dump’s camera, moved into the vault’s space, whose origin is the room center 12 m south of the world origin.
    const origin = new Vector3(6.051, 1.62, -11.74 - roomCenterZ)
    const target = new Vector3(0, lobbyLunetteRelief.y, lobbyLunetteRelief.faceZ)
    const raycaster = new Raycaster(origin, target.sub(origin).normalize())
    const [hit] = raycaster.intersectObject(mesh)
    expect(hit).toBeDefined()
    expect(hit.point.y).toBeGreaterThan(lobbyVault.springY)
    expect(hit.point.y).toBeLessThan(lobbyVault.crownY)
    expect(Math.abs(hit.point.x)).toBeLessThan(lobbyLunetteRelief.panel.width / 2)
  })
  test('stays within a small triangle budget', () => {
    const total = triangleCount(geometry.gilt) + triangleCount(geometry.field)
    expect(total).toBeGreaterThan(200)
    expect(total).toBeLessThan(4000)
  })
})
