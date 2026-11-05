import type {Orb} from '../../src/lib/gallery/orbs/index.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {mulberry32} from 'math/random'

import {corniceBands, wallFace, wallOpeningTrim} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionCrater} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {climbApproach} from '../../src/lib/gallery/climb.ts'
import {helmet, knife, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import forge, {forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeBore, forgeDrop, forgeGutters} from '../../src/lib/gallery/forgeGutter.ts'
import GutterGeometry from '../../src/lib/gallery/GutterGeometry.ts'
import {releaseCandidates, releasedOrb, releaseLocked} from '../../src/lib/gallery/orbRelease.ts'
import {halloweenOrb, horrorOrb, orbRadius, randomOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'
import {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {openingTop, wallCoordinates, wallOffset} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls from './fixtures/gallery.ts'
import {addOrb, forgeAndBastionColliders, physicsWorld} from './helpers/bastionWorld.ts'

await RAPIER.init()
const {room, vestibule} = forgeGutters
const geometries = {
  room: new GutterGeometry(room),
  vestibule: new GutterGeometry(vestibule),
}
afterAll(() => {
  for (const geometry of Object.values(geometries)) {
    geometry.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const [westX, eastX] = [forge.center[0] - forge.size[0] / 2, forge.center[0] + forge.size[0] / 2]
const [northZ, southZ] = [forge.center[1] - forge.size[1] / 2, forge.center[1] + forge.size[1] / 2]
const lineHeading = room.route.end.heading
describe('the Forge’s gutters', () => {
  test('the room’s falls evenly from its closed head under the hole in the ceiling, north along the west wall, round the corner and east along the north wall, low enough to watch an orb roll along it, to its end over the ledge before the opening through the walls', () => {
    // An orb starts just over the ceiling slab, right over the hole, and drops into the head.
    const [x, y, z] = forgeDrop.spawn
    expect(y - orbRadius).toBeGreaterThan(salonCeiling.y + salonCeiling.thickness / 2)
    expect([x, z]).toEqual([...forgeDrop.point])
    const drop = room.route.project(x, z)!
    expect(drop.along).toBeGreaterThan(room.radius)
    expect(Math.abs(drop.right)).toBeLessThan(1e-9)
    expect(forgeDrop.radius - orbRadius).toBeGreaterThan(0.04)
    expect(room.closed).toBe(true)
    // The short way round: north, round the room’s north-west corner, and east to the opening, off the wall in a last turn onto the line through it.
    const lines = room.route.pieces.filter(piece => piece.kind === 'line')
    expect(lines).toHaveLength(2)
    expect(lines[0].heading).toBeCloseTo(-Math.PI / 2, 9)
    expect(lines[1].heading).toBeCloseTo(0, 9)
    expect(room.route.length).toBeLessThan(12)
    expect(lineHeading).toBeLessThan(0)
    expect(lineHeading).toBeGreaterThan(-Math.PI / 2)
    // Its bottom over a tall visitor’s reach, but its rims well over a meter under the ceiling, low enough to look into from across the room.
    expect(room.head + room.radius + room.thickness).toBeLessThan(salonCeiling.underside - 1.2)
    expect(room.bottom(room.route.length)).toBeGreaterThan(3)
    for (let along = 0; along < room.route.length; along += 0.5) {
      expect(room.bottom(along) - room.bottom(along + 0.5)).toBeCloseTo(room.grade * 0.5, 9)
    }
  })
  test('its brackets stand in the west and north walls along its runs beside them, the channel clear of their cornices', () => {
    const outside = room.radius + room.thickness
    const cornice = Math.max(...corniceBands.map(band => band.front))
    expect(room.spans).toHaveLength(2)
    for (const {from, to, side} of room.spans) {
      expect(side).toBe(-1)
      for (let along = from; along <= to; along += 0.25) {
        const {point: [x, z]} = room.route.at(along)
        const apart = Math.min(x - westX, eastX - x, z - northZ, southZ - z)
        expect(apart).toBeCloseTo(room.offset, 6)
        expect(apart - outside).toBeGreaterThan(cornice)
      }
    }
    for (const part of [geometries.room.channel, geometries.room.brackets, geometries.room.collision, geometries.vestibule.channel, geometries.vestibule.brackets, geometries.vestibule.collision]) {
      expect(part.getAttribute('position').count).toBeGreaterThan(0)
    }
  })
  test('they open into wider mouths with rims leaning in where orbs drop or roll in, and elsewhere leave the upper half of an orb rolling along them in sight over their rims', () => {
    for (const gutter of [room, vestibule]) {
      expect(gutter.lipAt(0)).toBeGreaterThan(Math.PI / 2)
      expect(gutter.lipAt(2)).toBe(gutter.lip)
      // An orb coming in a quarter meter off the middle still lands inside the mouth.
      expect(gutter.radiusAt(0) * Math.sin(gutter.lipAt(0))).toBeGreaterThan(0.25)
      expect(gutter.radiusAt(2)).toBe(gutter.radius)
      // An orb lying in it rises over its rims by more than its radius.
      expect(orbRadius * 2 - gutter.radius * (1 - Math.cos(gutter.lip))).toBeGreaterThan(orbRadius)
    }
    // The orb dropping in lands within the leaning stretch.
    expect(room.route.project(...forgeDrop.point)!.along).toBeLessThan(room.catch!.length)
  })
  test('orbs roll from the room’s gutter across a ledge, through a bare opening over the vestibule’s arch where both walls touch and across another ledge into the vestibule’s gutter, on the masonry all the way', () => {
    const north = wallById('forge-north')
    const ring = wallById('forge-vestibule')
    const into = north.holes!.find(hole => hole.name === 'gutter')!
    const arch = north.holes!.find(hole => hole.name === 'vestibule')!
    const out = ring.holes!.find(hole => hole.name === 'gutter')!
    // Over the arch’s casing, straight up from its crown
    expect(Math.abs(into.u - arch.u)).toBeLessThan(0.05)
    expect(into.bottom!).toBeGreaterThan(arch.height + wallOpeningTrim + 0.1)
    for (const [wall, hole] of [[north, into], [ring, out]] as const) {
      expect(hole.casing).toBe(false)
      expect(hole.bottom).toBeCloseTo(forgeBore.sill, 9)
      // Every point along the way through either wall lies within its hole, an orb rolling there clear of its edges.
      const [fromX, fromZ] = forgeBore.from
      const [toX, toZ] = forgeBore.to
      let crossed = 0
      for (let share = 0; share <= 1; share += 0.01) {
        const point: Vec3 = [fromX + (toX - fromX) * share, forgeBore.sill, fromZ + (toZ - fromZ) * share]
        if (Math.abs(wallOffset(wall, point)) > wallFace) {
          continue
        }
        crossed++
        const u = wallCoordinates(wall, point)
        expect(Math.abs(u - hole.u)).toBeLessThan(hole.width / 2 - orbRadius)
        expect(forgeBore.sill + orbRadius * 2 + 0.05).toBeLessThan(openingTop(hole, u))
      }
      expect(crossed).toBeGreaterThan(0)
    }
    // Both walls touch on the line, so there is no gap behind either to cross.
    const [x, z] = forgeBore.from
    const [x2, z2] = forgeBore.to
    const middle: Vec3 = [(x + x2) / 2, forgeBore.sill, (z + z2) / 2]
    expect(Math.abs(wallOffset(north, middle))).toBeLessThan(0.02)
    expect(Math.abs(wallOffset(ring, middle))).toBeLessThan(0.02)
    // The room’s gutter ends on the front of the first ledge, its brass resting just over it, and the vestibule’s starts at the front of the second, a step under it.
    for (const [point, end] of [[room.route.end.point, forgeBore.from], [vestibule.route.start, forgeBore.to]] as const) {
      expect(point[0]).toBeCloseTo(end[0], 9)
      expect(point[1]).toBeCloseTo(end[1], 9)
    }
    expect(room.bottom(room.route.length) - room.thickness - forgeBore.sill).toBeGreaterThan(0)
    expect(room.bottom(room.route.length) - room.thickness - forgeBore.sill).toBeLessThan(0.01)
    expect(vestibule.head).toBeLessThan(forgeBore.sill)
    expect(vestibule.head).toBeGreaterThan(forgeBore.sill - 0.05)
    expect(vestibule.closed).toBe(false)
    const [roomLedge, vestibuleLedge] = forgeBore.ledges
    for (const [ledge, [endX, endZ]] of [[roomLedge, forgeBore.from], [vestibuleLedge, forgeBore.to]] as const) {
      // From the walls’ center lines out to the gutter’s cut end, wider than the slanting brass and the way through
      expect(Math.min(Math.abs(ledge.min[1] - northZ), Math.abs(ledge.max[1] - northZ))).toBeLessThan(1e-9)
      expect(Math.min(Math.abs(ledge.min[1] - endZ), Math.abs(ledge.max[1] - endZ))).toBeLessThan(1e-9)
      expect(endX - ledge.min[0]).toBeGreaterThan((room.radius + room.thickness) / Math.abs(Math.sin(lineHeading)))
      expect(ledge.max[0] - endX).toBeGreaterThan(0)
    }
    // The cut ends lie in the ledges’ fronts.
    for (const geometry of [geometries.room.channel, geometries.vestibule.channel]) {
      const position = geometry.getAttribute('position')
      let flush = 0
      for (let i = 0; i < position.count; i++) {
        // as precise as their 32-bit floats
        if ([forgeBore.from[1], forgeBore.to[1]].some(front => Math.abs(position.getZ(i) - front) < 1e-5)) {
          flush++
        }
      }
      expect(flush).toBeGreaterThan(20)
    }
  })
  test('the vestibule’s hangs from the ceiling on rods and swings round a hook onto the vestibule’s axis, ending in the air heading west at the arch onto the Bastion’s approach', () => {
    expect(vestibule.hung).toEqual([[0, vestibule.route.length]])
    const {point: [endX, endZ], heading} = vestibule.route.end
    expect(endZ).toBeCloseTo(forgeVestibule.center[1], 9)
    expect(Math.cos(heading)).toBeCloseTo(-1, 9)
    expect(endX - forgeVestibule.center[0]).toBeCloseTo(1, 9)
    expect(climbApproach.route.end.point[1]).toBeCloseTo(endZ, 9)
    // Its whole length over the vestibule’s floor, inside its wall
    for (let along = 0; along <= vestibule.route.length; along += 0.1) {
      const {point: [x, z]} = vestibule.route.at(along)
      expect(Math.hypot(x - forgeVestibule.center[0], z - forgeVestibule.center[1])).toBeLessThan(forgeVestibule.radius - room.radius - room.thickness - wallFace)
    }
    expect(vestibule.bottom(vestibule.route.length)).toBeGreaterThan(3)
  })
})
const roomAt = (position: Vec3) => slopGallery.roomAt(position)?.id
describe('the Forge’s orb release', () => {
  const orb = transparentOrb.propId
  test('stays locked while any orb is in the Forge or anywhere in the Bastion, but not for other props or orbs elsewhere', () => {
    expect(releaseLocked([], roomAt)).toBe(false)
    expect(releaseLocked([[orb, forgeDrop.spawn]], roomAt)).toBe(true)
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
  test('of the orbs it releases, which all roll round both gutters, nine in ten roll on out across the vestibule, down the climb on their own and through the gate’s hatch, and four in five of those into the Bastion’s crater', () => {
    const colliders = forgeAndBastionColliders()
    const state = mulberry32.create(7)
    const scatter = () => (mulberry32.sample(state) * 2 - 1) * 0.015
    const {hatch, wall} = bastionLinkGate
    const [hatchX, gateZ] = [wall.center[0] + hatch.u, wall.center[2]]
    const releases = 20
    let through = 0
    let caught = 0
    for (let release = 0; release < releases; release++) {
      const world = physicsWorld(colliders)
      try {
        const [x, y, z] = forgeDrop.spawn
        const body = addOrb(world, [x + scatter(), y, z + scatter()])
        let gutter: 'room' | 'vestibule' = 'room'
        let leftGutters = false
        let mostOff = 0
        let atGate: number | undefined
        let previousZ = Infinity
        for (let step = 0; step < 60 * 80; step++) {
          world.step()
          const position = body.translation()
          // In the gutters, it keeps to their channels until the vestibule’s open end.
          if (!leftGutters && position.y > forgeBore.sill - 0.5) {
            const projection = forgeGutters[gutter].route.project(position.x, position.z)
            if (projection) {
              mostOff = Math.max(mostOff, Math.abs(projection.right))
            }
            if (gutter === 'room' && (!projection || projection.along >= room.route.length - 1e-3)) {
              gutter = 'vestibule'
            }
            leftGutters = gutter === 'vestibule' && !!projection && projection.along > vestibule.route.length - 0.05
          }
          // Low down in the mouth, it passes the gate where it stands, through its hatch.
          if (position.y < -3 && previousZ > gateZ && position.z <= gateZ && atGate === undefined) {
            atGate = position.x
          }
          previousZ = position.z
        }
        expect(leftGutters).toBe(true)
        expect(mostOff).toBeLessThan(room.radius)
        if (atGate === undefined) {
          continue
        }
        through++
        expect(Math.abs(atGate - hatchX)).toBeLessThan(hatch.width / 2 - orbRadius / 2)
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
