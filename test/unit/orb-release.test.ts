import type {Orb} from '../../src/lib/gallery/orbs/index.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {mulberry32} from 'math/random'

import {corniceBands, wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionCrater} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {climbApproach, climbMouthRunnel} from '../../src/lib/gallery/climb.ts'
import {helmet, knife, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import forge, {forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeGutter} from '../../src/lib/gallery/forgeGutter.ts'
import GutterGeometry from '../../src/lib/gallery/GutterGeometry.ts'
import {forgeWindow} from '../../src/lib/gallery/lobbyWindows.ts'
import {releaseCandidates, releasedOrb, releaseLocked} from '../../src/lib/gallery/orbRelease.ts'
import {halloweenOrb, horrorOrb, orbRadius, randomOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'
import {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {openingTop, wallCoordinates, wallOffset} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls from './fixtures/gallery.ts'
import {addOrb, forgeAndBastionColliders, physicsWorld} from './helpers/bastionWorld.ts'

await RAPIER.init()
const {route} = forgeGutter
const geometry = new GutterGeometry(forgeGutter)
afterAll(() => {
  geometry.dispose()
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const [westX, eastX] = [forge.center[0] - forge.size[0] / 2, forge.center[0] + forge.size[0] / 2]
const [northZ, southZ] = [forge.center[1] - forge.size[1] / 2, forge.center[1] + forge.size[1] / 2]
describe('the Forge’s gutter', () => {
  test('falls evenly from its closed head under the hole in the ceiling, round the room under its cornice and round the vestibule, to its open end heading west on the vestibule’s axis', () => {
    // An orb starts just over the ceiling slab, right over the hole, and drops into the head.
    const [x, y, z] = forgeGutter.spawn
    expect(y - orbRadius).toBeGreaterThan(salonCeiling.y + salonCeiling.thickness / 2)
    expect([x, z]).toEqual([...forgeGutter.drop])
    const drop = route.project(x, z)!
    expect(drop.along).toBeGreaterThan(forgeGutter.radius)
    expect(Math.abs(drop.right)).toBeLessThan(1e-9)
    expect(forgeGutter.dropRadius - orbRadius).toBeGreaterThan(0.04)
    // Its rims stay under the ceiling, its bottom over a tall visitor’s reach.
    expect(forgeGutter.head + forgeGutter.radius + forgeGutter.thickness).toBeLessThan(salonCeiling.underside - 0.2)
    expect(forgeGutter.bottom(route.length)).toBeGreaterThan(3)
    for (let along = 0; along < route.length; along += 0.5) {
      expect(forgeGutter.bottom(along) - forgeGutter.bottom(along + 0.5)).toBeCloseTo(forgeGutter.grade * 0.5, 9)
    }
    // It ends in the air over the vestibule, heading west straight at the arch onto the Bastion’s approach.
    const {point: [endX, endZ], heading} = route.end
    expect(endZ).toBeCloseTo(forgeVestibule.center[1], 9)
    expect(Math.cos(heading)).toBeCloseTo(-1, 9)
    expect(Math.hypot(endX - forgeVestibule.center[0], endZ - forgeVestibule.center[1])).toBeLessThan(forgeVestibule.radius - 1)
    expect(climbApproach.route.end.point[1]).toBeCloseTo(endZ, 9)
  })
  test('runs along the walls clear of their cornices, its brackets in the walls, and hangs from the ceiling where it passes the window into the Lobby', () => {
    const outside = forgeGutter.radius + forgeGutter.thickness
    const cornice = Math.max(...corniceBands.map(band => band.front))
    for (const {from, to} of forgeGutter.spans) {
      for (let along = from; along <= to; along += 0.25) {
        const {point: [x, z]} = route.at(along)
        const inRoom = x > westX && x < eastX && z > northZ && z < southZ
        // Along the room’s walls or round the vestibule’s, as far in front of their center lines
        const apart = inRoom ? Math.min(x - westX, eastX - x, z - northZ, southZ - z) : forgeVestibule.radius - Math.hypot(x - forgeVestibule.center[0], z - forgeVestibule.center[1])
        expect(apart).toBeCloseTo(forgeGutter.offset, 6)
        expect(apart - outside).toBeGreaterThan(cornice)
        // Its brackets keep off the window.
        if (Math.abs(x - forgeWindow.x) < 1) {
          expect(Math.abs(z - forgeWindow.z)).toBeGreaterThan(forgeWindow.width / 2 + 0.3)
        }
      }
    }
    const [[from, to]] = forgeGutter.hung
    for (const along of [from, to]) {
      expect(Math.abs(route.at(along).point[1] - forgeWindow.z)).toBeGreaterThan(forgeWindow.width / 2 + 0.3)
    }
    expect(Math.abs(route.at((from + to) / 2).point[1] - forgeWindow.z)).toBeLessThan(0.5)
    // Passing it, the brass stays in front of the window’s casing, over its head.
    const casing = wallById('forge-east').holes!.find(hole => hole.name === 'lobby_window')!
    expect(forgeGutter.offset - outside).toBeGreaterThan(0.28)
    expect(forgeGutter.bottom(to) - forgeGutter.thickness).toBeGreaterThan(openingTop(casing, casing.u) - 0.3)
    for (const part of [geometry.channel, geometry.brackets, geometry.collision, geometry.duct]) {
      expect(part.getAttribute('position').count).toBeGreaterThan(0)
    }
  })
  test('passes through the north wall west of the vestibule’s arch and on through the vestibule’s wall, in a duct between them', () => {
    const north = wallById('forge-north')
    const ring = wallById('forge-vestibule')
    const into = north.holes!.find(hole => hole.name === 'gutter')!
    const arch = north.holes!.find(hole => hole.name === 'vestibule')!
    expect(into.u + into.width / 2).toBeLessThan(arch.u - arch.width / 2)
    expect(into.bottom!).toBeGreaterThan(arch.height + 0.5)
    expect(into.casing).toBe(false)
    const out = ring.holes!.find(hole => hole.name === 'gutter')!
    expect(out.casing).toBe(false)
    // Every station within either wall passes through its hole, the channel and an orb in it clear of the hole’s edges.
    for (const [wall, hole] of [[north, into], [ring, out]] as const) {
      let crossed = 0
      for (let along = 0; along <= route.length; along += 0.05) {
        const {point: [x, z], bottom} = forgeGutter.at(along)
        const local: Vec3 = [x, bottom, z]
        if (Math.abs(wallOffset(wall, local)) > wallFace) {
          continue
        }
        crossed++
        const u = wallCoordinates(wall, local)
        expect(Math.abs(u - hole.u)).toBeLessThan(hole.width / 2 - forgeGutter.radius)
        expect(bottom - forgeGutter.thickness).toBeGreaterThan(hole.bottom!)
        expect(bottom + orbRadius * 2).toBeLessThan(openingTop(hole, u))
      }
      expect(crossed).toBeGreaterThan(0)
    }
    // The duct lies in the gap between both walls only.
    const position = geometry.duct.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      const [x, z] = [position.getX(i), position.getZ(i)]
      expect(z).toBeLessThan(northZ + 1e-3)
      expect(Math.hypot(x - forgeVestibule.center[0], z - forgeVestibule.center[1])).toBeGreaterThan(forgeVestibule.radius - 1e-3)
    }
  })
})
const roomAt = (position: Vec3) => slopGallery.roomAt(position)?.id
describe('the Forge’s orb release', () => {
  const orb = transparentOrb.propId
  test('stays locked while any orb is in the Forge or anywhere in the Bastion, but not for other props or orbs elsewhere', () => {
    expect(releaseLocked([], roomAt)).toBe(false)
    expect(releaseLocked([[orb, forgeGutter.spawn]], roomAt)).toBe(true)
    expect(releaseLocked([[`${orb}-released-3`, [forge.center[0], 1, forge.center[1]]]], roomAt)).toBe(true)
    expect(releaseLocked([['prop-orb-spook', [bastionCrater.center[0], bastionCrater.center[1] - 0.2, bastionCrater.center[2]]]], roomAt)).toBe(true)
    expect(releaseLocked([['prop-orb-horror', [-14, 1, -4]]], roomAt)).toBe(false)
    expect(releaseLocked([['prop-sculpture', [forge.center[0], 1, forge.center[1]]]], roomAt)).toBe(false)
  })
  test('gives an orb of its pool at random while nothing in the Forge steers it, each of them as often, but never the Horror Orb', () => {
    expect(randomOrbs).toEqual([transparentOrb, spookOrb, halloweenOrb])
    const counts = new Map<Orb, number>
    const draws = 300
    for (let i = 0; i < draws; i++) {
      const drawn = releasedOrb([], roomAt, (i + 0.5) / draws)
      counts.set(drawn, (counts.get(drawn) ?? 0) + 1)
    }
    expect(counts.keys().toArray()).toEqual([...randomOrbs])
    expect(counts.values().toArray()).toEqual([100, 100, 100])
    expect(releasedOrb([], roomAt, 0)).toBe(transparentOrb)
    expect(releasedOrb([], roomAt, 1 - 1e-12)).toBe(halloweenOrb)
  })
  test('gives the orb of a pumpkin, a knife or a helmet lying in the Forge or carried into it, and of those there one at random, but heeds neither them outside it nor other props in it', () => {
    const inForge: Vec3 = [forge.center[0], 1, forge.center[1]]
    const inVestibule: Vec3 = [forgeVestibule.center[0], 1.4, forgeVestibule.center[1]]
    const inLobby: Vec3 = [0, 1, -20]
    expect(roomAt(inVestibule)).toBe('forge')
    expect(roomAt(inLobby)).not.toBe('forge')
    expect([pumpkin, knife, helmet].map(curio => curio.propId)).toEqual(['prop-pumpkin', 'prop-knife', 'prop-helmet'])
    expect(releaseCandidates([['prop-pumpkin', inForge]], roomAt)).toEqual([halloweenOrb])
    expect(releaseCandidates([['prop-knife', inVestibule]], roomAt)).toEqual([horrorOrb])
    expect(releaseCandidates([['prop-helmet-2', inForge]], roomAt)).toEqual([spookOrb])
    // Where they lie when a game begins, none of them is in the Forge yet.
    expect(releaseCandidates([pumpkin, knife, helmet].map(curio => [curio.propId, curio.position] as const), roomAt)).toBe(randomOrbs)
    // Several of a kind steer it no harder than one.
    expect(releaseCandidates([['prop-pumpkin', inForge], ['prop-pumpkin-2', inForge], ['prop-knife', inForge]], roomAt)).toEqual([halloweenOrb, horrorOrb])
    expect([0, 0.49, 0.5, 0.99].map(random => releasedOrb([['prop-pumpkin', inForge], ['prop-knife', inForge]], roomAt, random))).toEqual([halloweenOrb, halloweenOrb, horrorOrb, horrorOrb])
    expect(releaseCandidates([['prop-pumpkin', inLobby], ['prop-cube', inForge], ['prop-pumpkinseed', inForge], [halloweenOrb.propId, inForge]], roomAt)).toBe(randomOrbs)
  })
  test('of the orbs it releases, which all roll round the gutter, nine in ten roll on out across the vestibule, down the climb’s runnel and through the gate’s hatch, and four in five of those into the Bastion’s crater', () => {
    const colliders = forgeAndBastionColliders()
    const state = mulberry32.create(7)
    const scatter = () => (mulberry32.sample(state) * 2 - 1) * 0.015
    const [hatchX, gateZ] = [bastionLinkGate.wall.center[0] + bastionLinkGate.hatch.u, bastionLinkGate.wall.center[2]]
    const releases = 20
    let through = 0
    let caught = 0
    for (let release = 0; release < releases; release++) {
      const world = physicsWorld(colliders)
      try {
        const [x, y, z] = forgeGutter.spawn
        const body = addOrb(world, [x + scatter(), y, z + scatter()])
        let leftGutter = false
        let mostOff = 0
        let atGate: number | undefined
        let passed = false
        let previousZ = Infinity
        for (let step = 0; step < 60 * 110; step++) {
          world.step()
          const position = body.translation()
          // In the gutter, it keeps to the channel until its open end.
          if (!leftGutter && position.y > 3) {
            const projection = route.project(position.x, position.z)!
            mostOff = Math.max(mostOff, Math.abs(projection.right))
            leftGutter = projection.along > route.length - 0.05
          }
          // Low down in the mouth, it comes up to the gate, and on past it into the tunnel.
          if (position.y < climbMouthRunnel.y + 0.5) {
            if (previousZ > gateZ + 0.3 && position.z <= gateZ + 0.3) {
              atGate = position.x
            }
            if (previousZ > gateZ - 0.3 && position.z <= gateZ - 0.3) {
              passed = true
            }
          }
          previousZ = position.z
        }
        expect(leftGutter).toBe(true)
        expect(mostOff).toBeLessThan(forgeGutter.radius)
        if (!passed) {
          continue
        }
        through++
        // Only through the hatch: it came up to the gate right in front of it.
        expect(Math.abs(atGate! - hatchX)).toBeLessThan(bastionLinkGate.hatch.width / 2 - orbRadius)
        const {x: endX, y: endY, z: endZ} = body.translation()
        if (Math.hypot(endX - bastionCrater.center[0], endZ - bastionCrater.center[2]) < bastionCrater.radius * 1.05 && endY < bastionCrater.center[1]) {
          caught++
        }
      } finally {
        world.free()
      }
    }
    expect(through).toBeGreaterThanOrEqual(releases * 0.9)
    expect(caught).toBeGreaterThanOrEqual(through * 0.8)
  }, 120_000)
})
