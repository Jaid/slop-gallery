import type {Orb} from '../../src/lib/gallery/orbs/index.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {mulberry32} from 'math/random'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {alchemyCannon, alchemyPipe, alchemySink, cannonFlight, cannonLaunch, forgeOpening, holderSpot, inSinkThroat, machineBody, southWallFace, workbench} from '../../src/lib/gallery/alchemy/alchemyMachine.ts'
import CannonGeometry from '../../src/lib/gallery/alchemy/CannonGeometry.ts'
import {flavorCandidates, flavoredOrb, orbAround, transmutedOrb} from '../../src/lib/gallery/alchemy/flavor.ts'
import MachineBodyGeometry from '../../src/lib/gallery/alchemy/MachineBodyGeometry.ts'
import PipeGeometry from '../../src/lib/gallery/alchemy/PipeGeometry.ts'
import SinkGeometry from '../../src/lib/gallery/alchemy/SinkGeometry.ts'
import WorkbenchGeometry from '../../src/lib/gallery/alchemy/WorkbenchGeometry.ts'
import {colliderGeometry, wallFace, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import {corniceBands} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionCrater} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {helmet, knife, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import forge, {forgeRooflight, forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeOpeningCenter} from '../../src/lib/gallery/forgeOpening.ts'
import ForgeTurnGeometry, {forgeTurn} from '../../src/lib/gallery/ForgeTurnGeometry.ts'
import {orbSeat} from '../../src/lib/gallery/OrbHolderGeometry.ts'
import {halloweenOrb, horrorOrb, orbRadius, randomOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'
import {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {weldedSurfaceSkin} from '../../src/lib/physics/weldedSurface.ts'
import {insideOpening, openingCircle, wallCoordinates} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls from './fixtures/gallery.ts'
import {addOrb, forgeAndBastionColliders, physicsWorld} from './helpers/bastionWorld.ts'

await RAPIER.init()
const bench = new WorkbenchGeometry
const sink = new SinkGeometry
const turnPipe = new ForgeTurnGeometry
afterAll(() => {
  for (const geometry of [bench, sink, turnPipe]) {
    geometry.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const [benchX, benchZ] = workbench.center
const [sinkX, sinkY, sinkZ] = alchemySink.center
const northZ = forge.center[1] - forge.size[1] / 2
const roomAt = (position: Vec3) => slopGallery.roomAt(position)?.id
/** where the orb is after every step before it enters the pipe */
const flight = cannonFlight()
describe('the Forge’s alchemy machine', () => {
  test('stands against the middle of the south wall: its bench on the room’s axis, its sink in the bench’s east end and its body under the sink, between the legs', () => {
    expect(benchX).toBe(forge.center[0])
    expect(southWallFace - (benchZ + workbench.depth / 2)).toBeCloseTo(0.05, 9)
    expect(roomAt([benchX, 1, benchZ])).toBe('forge')
    // Left of the bench’s middle, seen from the room, with room for the flange and the aprons round it
    expect(sinkX).toBeGreaterThan(benchX)
    expect(benchX + workbench.length / 2 - (sinkX + alchemySink.radius)).toBeGreaterThan(0.1)
    expect(workbench.depth / 2 - workbench.overhang - workbench.apron[1] - (alchemySink.radius + alchemySink.thickness)).toBeGreaterThan(0.01)
    expect(sinkY).toBe(workbench.height)
    // An orb drops through the throat with room to spare, into the body under it.
    expect(alchemySink.throat - orbRadius - weldedSurfaceSkin).toBeGreaterThan(0.015)
    expect(alchemySink.throatY).toBeGreaterThan(machineBody.size[1] + orbRadius)
    expect(machineBody.center).toEqual([sinkX, benchZ])
    const legInside = workbench.length / 2 - workbench.overhang - workbench.leg
    expect(sinkX + machineBody.size[0] / 2 - benchX).toBeLessThan(legInside)
    expect(machineBody.size[2] / 2).toBeLessThan(workbench.depth / 2 - workbench.overhang - workbench.leg)
    // The holder stands right of the bench’s middle, on its top, an orb’s width clear of the cannon’s bracket over it.
    expect(holderSpot[0]).toBeLessThan(benchX - 0.4)
    expect(holderSpot[1]).toBe(workbench.height)
  })
  test('the bench’s top lies flush round the hole the sink fills, which an orb dropped there falls through and anything set down beside it stands on', () => {
    bench.top.computeBoundingBox()
    expect(bench.top.boundingBox!.max.y).toBeCloseTo(workbench.height, 6)
    expect(bench.top.boundingBox!.min.y).toBeCloseTo(workbench.height - workbench.top, 6)
    expect(bench.top.hasAttribute('woodGrain')).toBe(true)
    const material = new MeshBasicMaterial
    try {
      const top = new Mesh(bench.top, material)
      top.position.set(benchX, 0, benchZ)
      top.updateMatrixWorld()
      const down = new Vector3(0, -1, 0)
      const hits = (x: number, z: number) => {
        const ray = new Raycaster(new Vector3(x, 2, z), down)
        return ray.intersectObject(top).length > 0
      }
      expect(hits(sinkX, sinkZ)).toBe(false)
      expect(hits(sinkX + alchemySink.radius + alchemySink.thickness - 0.005, sinkZ)).toBe(false)
      expect(hits(sinkX + alchemySink.radius + alchemySink.thickness + 0.005, sinkZ)).toBe(true)
      expect(hits(holderSpot[0], holderSpot[2])).toBe(true)
    } finally {
      material.dispose()
    }
    // The sink’s brass runs from just over the top, its flange lying on it, down into the body.
    sink.metal.computeBoundingBox()
    const {min, max} = sink.metal.boundingBox!
    expect(max.y).toBeGreaterThan(0)
    expect(max.y).toBeLessThan(0.005)
    expect(sinkY + min.y).toBeLessThan(machineBody.size[1])
    expect(Math.max(max.x, -min.x)).toBeLessThan(alchemySink.radius + 0.04)
  })
  test('takes in every orb dropped into its sink and nearly every one thrown at it from in front of the bench, which rolls down the throat into its body', () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    const welded = (triangles: [Float32Array, Uint32Array], [x, y, z]: Vec3) => world.createCollider(RAPIER.ColliderDesc.trimesh(...triangles, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setContactSkin(weldedSurfaceSkin).setTranslation(x, y, z))
    /** whether an orb set off from the point with the velocity drops down the throat within 10 s */
    const taken = (start: Vec3, velocity: Vec3) => {
      const body = addOrb(world, start)
      body.setLinvel({
        x: velocity[0],
        y: velocity[1],
        z: velocity[2],
      }, true)
      try {
        for (let step = 0; step < 60 * 10; step++) {
          world.step()
          const {x, y, z} = body.translation()
          if (inSinkThroat([x, y, z])) {
            return true
          }
        }
        return false
      } finally {
        world.removeRigidBody(body)
      }
    }
    try {
      world.timestep = 1 / 60
      Object.assign(world.integrationParameters, {
        normalizedAllowedLinearError: 0.001,
        normalizedPredictionDistance: 0.002,
      })
      welded(colliderGeometry(bench.top), [benchX, 0, benchZ])
      welded(colliderGeometry(sink.collision), alchemySink.center)
      world.createCollider(RAPIER.ColliderDesc.cuboid(machineBody.size[0] / 2, machineBody.size[1] / 2, machineBody.size[2] / 2).setTranslation(sinkX, machineBody.size[1] / 2, sinkZ))
      world.createCollider(RAPIER.ColliderDesc.cuboid(8, 0.1, 8).setTranslation(benchX, -0.1, benchZ - 4))
      world.createCollider(RAPIER.ColliderDesc.cuboid(8, 3, 0.1).setTranslation(benchX, 3, southWallFace + 0.1))
      let dropped = 0
      for (let index = 0; index < 24; index++) {
        // Spread evenly over the bowl, 30 cm over the bench
        const [angle, out] = [index * 2.4, Math.sqrt((index + 0.5) / 24) * (alchemySink.radius - 0.02)]
        if (taken([sinkX + Math.cos(angle) * out, workbench.height + 0.3, sinkZ + Math.sin(angle) * out], [0, 0, 0])) {
          dropped++
        }
      }
      expect(dropped).toBe(24)
      // Thrown like a carried prop, 10 m/s along the view and 2 m/s up, from a player standing up to 4 m in front of the bench, aiming the throw’s arc at the sink’s middle
      let throws = 0
      let caught = 0
      for (const distance of [0.6, 1.5, 2.5, 4]) {
        for (const aside of [-0.4, 0, 0.4]) {
          const eye: Vec3 = [sinkX + aside, 1.6, benchZ - workbench.depth / 2 - 0.3 - distance]
          const yaw = Math.atan2(sinkX - eye[0], sinkZ - eye[2])
          const shot = (pitch: number) => {
            const direction: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
            return {
              start: [eye[0] + direction[0] * 0.5, eye[1] - 0.22 + direction[1] * 0.5, eye[2] + direction[2] * 0.5] as Vec3,
              velocity: [direction[0] * 10, direction[1] * 10 + 2, direction[2] * 10] as Vec3,
            }
          }
          /** how far from the sink’s middle the throw comes down to its rim */
          const miss = (pitch: number) => {
            const {start, velocity} = shot(pitch)
            const t = (velocity[1] + Math.sqrt(velocity[1] ** 2 + 2 * 9.81 * (start[1] - sinkY - 0.1))) / 9.81
            return Math.hypot(start[0] + velocity[0] * t - sinkX, start[2] + velocity[2] * t - sinkZ)
          }
          let pitch = -1.4
          for (let candidate = -1.4; candidate < 0.6; candidate += 0.002) {
            if (miss(candidate) < miss(pitch)) {
              pitch = candidate
            }
          }
          const {start, velocity} = shot(pitch)
          throws++
          if (taken(start, velocity)) {
            caught++
          }
        }
      }
      expect(caught).toBeGreaterThanOrEqual(throws * 0.9)
    } finally {
      world.free()
    }
  })
  test('its pipe runs from its body under the bench, up the south wall and along it into the cannon’s breech, and the cannon over the bench’s middle points north along the room’s axis', () => {
    const [start, riserFoot, riserTop, turn, end] = alchemyPipe.corners
    expect(start).toEqual([sinkX, start[1], benchZ])
    expect(riserFoot[0] - alchemyPipe.radius).toBeGreaterThan(benchX + workbench.length / 2)
    expect(riserTop[0]).toBe(riserFoot[0])
    expect(turn[0]).toBe(benchX)
    expect(end).toEqual(alchemyCannon.breech)
    // Clear of the bench’s top, the wall and the ceiling
    expect(riserTop[1] - alchemyPipe.radius).toBeGreaterThan(workbench.height + 0.5)
    for (const corner of alchemyPipe.corners) {
      expect(southWallFace - corner[2]).toBeGreaterThan(alchemyPipe.radius)
    }
    expect(alchemyPipe.bore).toBeGreaterThan(orbRadius)
    expect(alchemyCannon.axis[0]).toBe(0)
    expect(alchemyCannon.axis[2]).toBeLessThan(0)
    expect(alchemyCannon.bore - orbRadius).toBeGreaterThan(0.02)
    // High over a visitor’s head standing before the bench
    expect(alchemyCannon.muzzle[1] - 0.26).toBeGreaterThan(2.1)
    const body = new MachineBodyGeometry
    const pipe = new PipeGeometry
    const cannon = new CannonGeometry
    try {
      for (const part of [body.brass, body.glass, body.iron, pipe.brackets, pipe.pipe, cannon.barrel, cannon.bracket]) {
        expect(part.getAttribute('position').count).toBeGreaterThan(0)
      }
    } finally {
      for (const geometry of [body, pipe, cannon]) {
        geometry.dispose()
      }
    }
  })
})
describe('the alchemy machine’s cannon', () => {
  test('shoots an orb along its barrel, from a step down it, under the rooflight’s ring and the ceiling across the Forge, straight through the middle of the round opening over the arch', () => {
    for (const axis of [0, 1, 2]) {
      expect(cannonLaunch.position[axis] + alchemyCannon.axis[axis] * alchemyCannon.depth).toBeCloseTo(alchemyCannon.muzzle[axis], 9)
      expect(cannonLaunch.velocity[axis] / cannonLaunch.speed).toBeCloseTo(alchemyCannon.axis[axis], 9)
    }
    const ring = salonCeiling.underside - forgeRooflight.depth - forgeRooflight.bead
    for (const [x, y, z] of flight) {
      expect(x).toBe(forgeOpeningCenter[0])
      expect(y + orbRadius).toBeLessThan(salonCeiling.underside - 0.3)
      if (Math.abs(Math.hypot(x - forge.center[0], z - forge.center[1]) - forgeRooflight.radius - forgeRooflight.frame / 2) < forgeRooflight.frame / 2 + orbRadius + 0.05) {
        expect(y + orbRadius).toBeLessThan(ring - 0.1)
      }
    }
    const index = flight.findIndex(([, , z]) => z < northZ)
    const [before, after] = [flight[index - 1], flight[index]]
    const share = (before[2] - northZ) / (before[2] - after[2])
    expect(before[1] + (after[1] - before[1]) * share).toBeCloseTo(forgeOpeningCenter[1], 3)
  })
  test('Rapier flies an orb shot out of it along the very steps its aim follows, into the vestibule', () => {
    const world = physicsWorld(forgeAndBastionColliders())
    try {
      const body = addOrb(world, cannonLaunch.position)
      body.setLinvel({
        x: cannonLaunch.velocity[0],
        y: cannonLaunch.velocity[1],
        z: cannonLaunch.velocity[2],
      }, true)
      let worst = 0
      for (const point of flight.slice(0, -1)) {
        world.step()
        const {x, y, z} = body.translation()
        worst = Math.max(worst, Math.hypot(x - point[0], y - point[1], z - point[2]))
      }
      expect(worst).toBeLessThan(0.002)
    } finally {
      world.free()
    }
  })
  test('the round opening is as wide as an orb flying through both walls takes up on its way, with room for the walls’ skin and a little more, and lies bare over the arch’s casing, under the cornice', () => {
    const north = wallById('forge-north')
    const ring = wallById('forge-vestibule')
    const arch = north.holes!.find(hole => hole.name === 'vestibule')!
    expect(forgeOpening.center).toBe(forgeOpeningCenter)
    expect(forgeOpening.radius - orbRadius).toBeGreaterThan(weldedSurfaceSkin + 0.02)
    expect(forgeOpening.radius).toBeLessThan(0.3)
    for (const wall of [north, ring]) {
      const hole = wall.holes!.find(candidate => candidate.name === 'orbs')!
      expect([hole.profile, hole.casing]).toEqual(['round', false])
      const {center, radius} = openingCircle(hole)
      expect(radius).toBe(forgeOpening.radius)
      expect(wall.center[1] + center).toBeCloseTo(forgeOpeningCenter[1], 9)
      expect(hole.u).toBeCloseTo(wallCoordinates(wall, forgeOpeningCenter), 6)
      // Every step through the wall, the whole orb stays inside the opening, clear of its edge by the walls’ skin.
      for (const [x, y, z] of flight) {
        if (Math.abs(z - northZ) > wallFace + orbRadius) {
          continue
        }
        const u = wallCoordinates(wall, [x, y, z])
        for (const [du, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          expect(insideOpening(hole, u + du * (orbRadius + weldedSurfaceSkin), y - wall.center[1] + dy * (orbRadius + weldedSurfaceSkin))).toBe(true)
        }
      }
    }
    expect(forgeOpeningCenter[1] - forgeOpening.radius).toBeGreaterThan(arch.height + wallOpeningTrim + 0.2)
    expect(forgeOpeningCenter[1] + forgeOpening.radius).toBeLessThan(north.center[1] + north.height - corniceBands[0].drop - corniceBands[0].height / 2 - 0.1)
  })
})
describe('the Forge’s north-wall pipe', () => {
  test('turns 270° from the incoming shot to the westward approach, entirely inside the vestibule, with open ends and room for an orb', () => {
    expect(forgeTurn.sweep).toBeCloseTo(Math.PI * 1.5, 9)
    expect(forgeTurn.bore - orbRadius - weldedSurfaceSkin).toBeGreaterThan(0.04)
    const end = forgeTurn.getPoint(1)
    expect(end.z).toBeCloseTo(forgeVestibule.center[1], 9)
    expect(forgeTurn.getTangent(0).x).toBeCloseTo(0, 9)
    expect(forgeTurn.getTangent(1).z).toBeCloseTo(0, 9)
    expect(forgeTurn.getTangent(1).x).toBeLessThan(-0.9)
    for (let step = 0; step <= 100; step++) {
      const point = forgeTurn.getPoint(step / 100)
      expect(Math.hypot(point.x - forgeVestibule.center[0], point.z - forgeVestibule.center[1]) + forgeTurn.bore + forgeTurn.thickness).toBeLessThan(forgeVestibule.radius - wallFace)
      expect(point.y - forgeTurn.bore).toBeGreaterThan(1.5)
    }
    const material = new MeshBasicMaterial
    try {
      const mesh = new Mesh(turnPipe.pipe, material)
      mesh.updateMatrixWorld()
      for (const t of [0, 1]) {
        const tangent = forgeTurn.getTangent(t).multiplyScalar(t === 0 ? 1 : -1)
        const origin = forgeTurn.getPoint(t).addScaledVector(tangent, -0.1)
        const ray = new Raycaster(origin, tangent, 0, 0.2)
        expect(ray.intersectObject(mesh)).toHaveLength(0)
      }
    } finally {
      material.dispose()
    }
  })
})
describe('the alchemy machine’s orbs', () => {
  const orb = transparentOrb.propId
  test('an orb is around while any orb is in the Forge or anywhere in the Bastion, but not for other props or orbs elsewhere', () => {
    expect(orbAround([], roomAt)).toBe(false)
    expect(orbAround([[orb, cannonLaunch.position]], roomAt)).toBe(true)
    expect(orbAround([[`${orb}-holder-3`, [holderSpot[0], holderSpot[1] + orbSeat, holderSpot[2]]]], roomAt)).toBe(true)
    expect(orbAround([['prop-orb-spook', [bastionCrater.center[0], bastionCrater.center[1] - 0.2, bastionCrater.center[2]]]], roomAt)).toBe(true)
    expect(orbAround([['prop-orb-horror', [-14, 1, -4]]], roomAt)).toBe(false)
    expect(orbAround([['prop-sculpture', [forge.center[0], 1, forge.center[1]]]], roomAt)).toBe(false)
  })
  test('a flavored orb comes out as itself, while a Transparent Orb takes a flavor', () => {
    for (const flavored of [halloweenOrb, horrorOrb, spookOrb]) {
      for (const random of [0, 0.5, 0.99]) {
        expect(transmutedOrb(flavored, [['prop-pumpkin', [forge.center[0], 1, forge.center[1]]]], roomAt, random)).toBe(flavored)
      }
    }
    expect([0, 0.4, 0.99].map(random => transmutedOrb(transparentOrb, [], roomAt, random))).toEqual([transparentOrb, spookOrb, halloweenOrb])
    expect(transmutedOrb(transparentOrb, [['prop-knife', [forge.center[0], 1, forge.center[1]]]], roomAt, 0.3)).toBe(horrorOrb)
  })
  test('gives a Transparent Orb a flavor of its pool at random while nothing in the Forge steers it, each of them as often, but never the Horror Orb', () => {
    expect(randomOrbs).toEqual([transparentOrb, spookOrb, halloweenOrb])
    const counts = new Map<Orb, number>
    const draws = 300
    for (let index = 0; index < draws; index++) {
      const drawn = flavoredOrb([], roomAt, (index + 0.5) / draws)
      counts.set(drawn, (counts.get(drawn) ?? 0) + 1)
    }
    expect(counts.keys().toArray()).toEqual([...randomOrbs])
    expect(counts.values().toArray()).toEqual([100, 100, 100])
    expect(flavoredOrb([], roomAt, 0)).toBe(transparentOrb)
    expect(flavoredOrb([], roomAt, 1 - 1e-12)).toBe(halloweenOrb)
  })
  test('gives it the flavor of a pumpkin, a knife or a helmet lying in the Forge or carried into it, and of those there one at random, but heeds neither them outside it nor other props in it', () => {
    const inForge: Vec3 = [forge.center[0], 1, forge.center[1]]
    const inVestibule: Vec3 = [forgeVestibule.center[0], 1.4, forgeVestibule.center[1]]
    const inLobby: Vec3 = [0, 1, -20]
    expect(roomAt(inVestibule)).toBe('forge')
    expect(roomAt(inLobby)).not.toBe('forge')
    expect([pumpkin, knife, helmet].map(curio => curio.propId)).toEqual(['prop-pumpkin', 'prop-knife', 'prop-helmet'])
    expect(flavorCandidates([['prop-pumpkin', inForge]], roomAt)).toEqual([halloweenOrb])
    expect(flavorCandidates([['prop-knife', inVestibule]], roomAt)).toEqual([horrorOrb])
    expect(flavorCandidates([['prop-helmet-2', inForge]], roomAt)).toEqual([spookOrb])
    // Where they lie when a game begins, none of them is in the Forge yet.
    expect(flavorCandidates([pumpkin, knife, helmet].map(curio => [curio.propId, curio.position] as const), roomAt)).toBe(randomOrbs)
    // Several of a kind steer it no harder than one.
    expect(flavorCandidates([['prop-pumpkin', inForge], ['prop-pumpkin-2', inForge], ['prop-knife', inForge]], roomAt)).toEqual([halloweenOrb, horrorOrb])
    expect([0, 0.49, 0.5, 0.99].map(random => flavoredOrb([['prop-pumpkin', inForge], ['prop-knife', inForge]], roomAt, random))).toEqual([halloweenOrb, halloweenOrb, horrorOrb, horrorOrb])
    expect(flavorCandidates([['prop-pumpkin', inLobby], ['prop-cube', inForge], ['prop-pumpkinseed', inForge], [halloweenOrb.propId, inForge]], roomAt)).toBe(randomOrbs)
  })
  test('scattered cannon shots pass the opening untouched, retain their speed through the pipe and travel down the Bastion to its crater without surface drag', () => {
    const colliders = forgeAndBastionColliders()
    const state = mulberry32.create(7)
    const scatter = (size: number) => (mulberry32.sample(state) * 2 - 1) * size
    const {hatch, wall} = bastionLinkGate
    const [hatchX, gateZ] = [wall.center[0] + hatch.u, wall.center[2]]
    const shots = 20
    let through = 0
    let caught = 0
    /** steps an orb rolled at a good pace, and of those, how many it moved much less than its velocity says */
    let rolling = 0
    let dragged = 0
    for (let shot = 0; shot < shots; shot++) {
      const world = physicsWorld(colliders)
      try {
        const body = addOrb(world, cannonLaunch.position)
        const speed = 1 + scatter(0.001)
        const [vx, vy, vz] = cannonLaunch.velocity
        body.setLinvel({
          x: vx + scatter(0.01),
          y: vy * speed + scatter(0.01),
          z: vz * speed,
        }, true)
        let untouched = true
        let entered = false
        let exited = false
        let inletSpeed = 0
        let exitSpeed = 0
        let atGate: number | undefined
        let previousZ = Infinity
        let previous = body.translation()
        for (let step = 0; step < 60 * 60; step++) {
          const before = body.linvel()
          world.step()
          const position = body.translation()
          const velocity = body.linvel()
          // Flying freely right up to the pipe, gravity alone changing its velocity.
          if (!entered && position.z > forgeTurn.inlet.z + 0.3 && Math.hypot(velocity.x - before.x, velocity.z - before.z) > 1e-6) {
            untouched = false
          }
          const pace = Math.hypot(velocity.x, velocity.y, velocity.z)
          if (!entered && position.z <= forgeTurn.inlet.z) {
            entered = true
            inletSpeed = pace
          }
          const end = forgeTurn.getPoint(1)
          if (entered && !exited && position.x < end.x - 0.3 && Math.abs(position.z - end.z) < 0.4 && position.y < end.y + 0.3) {
            exited = true
            exitSpeed = pace
          }
          if (pace > 1 && exited) {
            rolling++
            if (Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z) < pace * world.timestep * 0.8) {
              dragged++
            }
          }
          previous = position
          // Low down in the mouth, it passes the gate where it stands, through its hatch.
          if (position.y < -3 && previousZ > gateZ && position.z <= gateZ && atGate === undefined) {
            atGate = position.x
          }
          previousZ = position.z
        }
        expect(untouched).toBe(true)
        expect(entered).toBe(true)
        expect(exited).toBe(true)
        expect(exitSpeed / inletSpeed).toBeGreaterThan(0.5)
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
    expect(through).toBeGreaterThanOrEqual(shots * 0.9)
    expect(caught).toBeGreaterThanOrEqual(through * 0.8)
    // but where they strike something
    expect(dragged / rolling).toBeLessThan(0.02)
  }, 120_000)
})
