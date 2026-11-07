import type {Orb} from '../../src/lib/gallery/orbs/index.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {mulberry32} from 'math/random'
import {Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector3} from 'three/webgpu'

import {alchemyCannon, alchemyPipe, alchemySink, cannonFlight, cannonLaunch, cannonTarget, holderSpot, inSinkThroat, machineBody, southWallFace, flight as stepsFrom, workbench} from '../../src/lib/gallery/alchemy/alchemyMachine.ts'
import CannonGeometry from '../../src/lib/gallery/alchemy/CannonGeometry.ts'
import {flavorCandidates, flavoredOrb, orbAround, transmutedOrb} from '../../src/lib/gallery/alchemy/flavor.ts'
import MachineBodyGeometry from '../../src/lib/gallery/alchemy/MachineBodyGeometry.ts'
import PipeGeometry from '../../src/lib/gallery/alchemy/PipeGeometry.ts'
import SinkGeometry from '../../src/lib/gallery/alchemy/SinkGeometry.ts'
import WorkbenchGeometry from '../../src/lib/gallery/alchemy/WorkbenchGeometry.ts'
import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {bandHeight, barRadius} from '../../src/lib/gallery/BarredOpeningGeometry.ts'
import {bastionCrater} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {cistern, cisternBackstop, cisternChannel, cisternFloorHeight} from '../../src/lib/gallery/cistern/cistern.ts'
import {cisternGrille} from '../../src/lib/gallery/cistern/grille.ts'
import {climbApproach, climbCulvert, climbRun} from '../../src/lib/gallery/climb.ts'
import {hatchet, helmet, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import forge, {forgeRooflight, forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {orbSeat} from '../../src/lib/gallery/OrbHolderGeometry.ts'
import {halloweenOrb, horrorOrb, orbRadius, randomOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'
import {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {weldedSurfaceSkin} from '../../src/lib/physics/weldedSurface.ts'
import {insideOpening, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import {bastionBaseboard} from '../../src/rooms/bastion/walls.ts'
import CannonFx, {charging} from '../../src/rooms/forge/components/AlchemyMachine/CannonFx.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import {openings} from '../../src/worlds/gallery/relations.ts'
import walls, {floorHeight, insideGallery} from './fixtures/gallery.ts'
import {addOrb, forgeAndBastionColliders, physicsWorld} from './helpers/bastionWorld.ts'

await RAPIER.init()
const bench = new WorkbenchGeometry
const sink = new SinkGeometry
afterAll(() => {
  for (const geometry of [bench, sink]) {
    geometry.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const [benchX, benchZ] = workbench.center
const [sinkX, sinkY, sinkZ] = alchemySink.center
const northZ = forge.center[1] - forge.size[1] / 2
const roomAt = (position: Vec3) => slopGallery.roomAt(position)?.id
/** where the orb is after every step before it passes the face of the cistern’s wall behind the grille */
const flight = cannonFlight.points
/** Where the orb’s middle is as it crosses the plane `z`, between the steps on either side of it, flying on freely past where `flight` ends. */
const crossing = (z: number) => {
  let previous = cannonLaunch.position
  for (const point of stepsFrom(cannonLaunch.position, cannonLaunch.velocity)) {
    if (point[2] <= z) {
      const share = (previous[2] - z) / (previous[2] - point[2])
      return previous.map((value, axis) => value + (point[axis] - value) * share) as Vec3
    }
    previous = point
  }
  throw new Error('An orb flies on forever.')
}
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
  test('takes in every orb dropped into its sink and some thrown at it from in front of the bench, nearly at eye height, which roll down the throat into its body', () => {
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
      // Thrown like a carried prop, 10 m/s along the view and 2 m/s up, from a player standing up to 4 m in front of the bench, aiming the throw’s arc at the middle of the bowl, a hand over the bench: it stands nearly at eye height, so every throw comes at the sink almost flat, and the bowl flings many out again like a ramp.
      const target: Vec3 = [sinkX, sinkY + 0.15, sinkZ]
      let throws = 0
      let caught = 0
      for (const distance of [0.6, 1.5, 2.5, 4]) {
        for (const aside of [-0.4, 0, 0.4]) {
          const eye: Vec3 = [sinkX + aside, 1.6, benchZ - workbench.depth / 2 - 0.3 - distance]
          const yaw = Math.atan2(target[0] - eye[0], target[2] - eye[2])
          const shot = (pitch: number) => {
            const direction: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
            return {
              start: [eye[0] + direction[0] * 0.5, eye[1] - 0.22 + direction[1] * 0.5, eye[2] + direction[2] * 0.5] as Vec3,
              velocity: [direction[0] * 10, direction[1] * 10 + 2, direction[2] * 10] as Vec3,
            }
          }
          /** how far over or under the target the throw passes it */
          const miss = (pitch: number) => {
            const {start, velocity} = shot(pitch)
            const t = Math.hypot(target[0] - start[0], target[2] - start[2]) / Math.hypot(velocity[0], velocity[2])
            return Math.abs(start[1] + velocity[1] * t - 9.81 * t ** 2 / 2 - target[1])
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
      // Hard to land, but not hopeless
      expect(caught).toBeGreaterThanOrEqual(throws / 4)
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
  test('shoots an orb along its barrel, from a step down it, under the rooflight’s ring and the ceiling across the Forge, through the arch over the middle of its threshold, and through the middle of the grille’s lowest cell', () => {
    for (const axis of [0, 1, 2]) {
      expect(cannonLaunch.position[axis] + alchemyCannon.axis[axis] * alchemyCannon.depth).toBeCloseTo(alchemyCannon.muzzle[axis], 9)
      expect(cannonLaunch.velocity[axis] / cannonLaunch.speed).toBeCloseTo(alchemyCannon.axis[axis], 9)
    }
    expect(alchemyCannon.elevation).toBeGreaterThan(0)
    const ring = salonCeiling.underside - forgeRooflight.depth - forgeRooflight.bead
    for (const [x, y, z] of flight) {
      expect(x).toBe(cannonTarget.arch[0])
      expect(y + orbRadius).toBeLessThan(salonCeiling.underside - 0.3)
      if (Math.abs(Math.hypot(x - forge.center[0], z - forge.center[1]) - forgeRooflight.radius - forgeRooflight.frame / 2) < forgeRooflight.frame / 2 + orbRadius + 0.05) {
        expect(y + orbRadius).toBeLessThan(ring - 0.1)
      }
    }
    expect(crossing(northZ)[1]).toBeCloseTo(cannonTarget.arch[1], 3)
    expect(cannonTarget.grille).toEqual([cisternGrille.center[0], cisternGrille.sill + cisternGrille.pitch / 2, cisternGrille.barZ])
    expect(crossing(cisternGrille.barZ)[1]).toBeCloseTo(cannonTarget.grille[1], 3)
    // Its last step falls short of the face of the cistern’s wall by less than a step.
    const last = flight.at(-1)!
    expect(last[2]).toBeGreaterThan(cisternGrille.channelZ)
    expect(last[2] - cisternGrille.channelZ).toBeLessThan(Math.abs(cannonLaunch.velocity[2]) / 60)
  })
  test('Rapier flies an orb shot out of it along the very steps its aim follows, up to the grille', () => {
    const world = physicsWorld(forgeAndBastionColliders())
    try {
      const body = addOrb(world, cannonLaunch.position)
      body.setLinvel({
        x: cannonLaunch.velocity[0],
        y: cannonLaunch.velocity[1],
        z: cannonLaunch.velocity[2],
      }, true)
      let worst = 0
      for (const point of flight) {
        world.step()
        const {x, y, z} = body.translation()
        worst = Math.max(worst, Math.hypot(x - point[0], y - point[1], z - point[2]))
      }
      expect(worst).toBeLessThan(0.002)
    } finally {
      world.free()
    }
  })
  test('the orb passes the arch between the Forge and its vestibule well clear of its crown and the grille’s lowest cell clear of its bars, bands and sill, and no wall has an opening of its own for it', () => {
    const north = wallById('forge-north')
    const ring = wallById('forge-vestibule')
    const arches = [[north, north.holes!.find(hole => hole.name === 'vestibule')!], [ring, ring.holes!.find(hole => hole.name === 'forge')!]] as const
    for (const [wall, hole] of arches) {
      // Every step within the arch, the whole orb stays inside it, clear of its edge by the walls’ skin and a hand more.
      const clearance = orbRadius + weldedSurfaceSkin + 0.1
      let inside = 0
      for (const [x, y, z] of flight) {
        if (Math.abs(z - northZ) > wallFace + orbRadius + 0.3) {
          continue
        }
        inside++
        const u = wallCoordinates(wall, [x, y, z])
        for (const [du, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          expect(insideOpening(hole, u + du * clearance, y - wall.center[1] + dy * clearance)).toBe(true)
        }
      }
      expect(inside).toBeGreaterThan(0)
    }
    expect(north.holes!.map(hole => hole.name)).toEqual(['vestibule'])
    // Through the grille, from the vestibule’s face of the round wall to the cistern’s face of the flat wall, every centimeter of the way, the orb keeps clear of the bars beside it, the band over it and the sill under it.
    const [grilleX, wallZ] = cisternGrille.center
    const {barZ, pitch, sill} = cisternGrille
    const band = cisternGrille.bands[0]
    for (let z = wallZ + wallFace; z >= wallZ - wallFace; z -= 0.01) {
      const [x, y] = crossing(z)
      expect(x).toBe(grilleX)
      expect(y - orbRadius - sill).toBeGreaterThan(0.03)
      // The bars and the band stand upright in the plane of the bars.
      for (const side of [-1, 1]) {
        expect(Math.hypot(grilleX + side * pitch / 2 - x, barZ - z) - barRadius - orbRadius).toBeGreaterThan(0.03)
      }
      expect(Math.hypot(Math.max(0, band - bandHeight / 2 - y), barZ - z) - orbRadius).toBeGreaterThan(0.03)
    }
  })
})
describe('the alchemy machine’s cannon going off', () => {
  test('gathers itself, squashing while a swell runs up its barrel, then stretches, kicks back and wobbles home with a bang out of its muzzle, and lets a new flavor’s effect burst out with the orb', () => {
    const fx = new CannonFx
    const barrel = new Object3D
    const breech = new Vector3(...alchemyCannon.breech)
    const fromBreech = () => barrel.position.distanceTo(breech)
    try {
      fx.update(0, barrel)
      expect(barrel.scale.toArray()).toEqual([1, 1, 1])
      expect(fromBreech()).toBe(0)
      expect(fx.swell.size.value).toBe(0)
      // A new Halloween Orb’s bats wait hidden in the cannon; a Transparent Orb brings no effect.
      const halloween = `${halloweenOrb.propId}-alchemy-1`
      fx.prepare(halloween, halloweenOrb.effect)
      fx.prepare(transparentOrb.propId, transparentOrb.effect)
      expect(fx.root.children).toHaveLength(2)
      const [bats] = fx.root.children.filter(child => child !== fx.blast) as Array<CannonFx['blast']>
      expect(bats.uniforms.clock.value).toBeLessThan(0)
      fx.charge(1)
      const swells = [1.04, 1.1, 1.16, 1.22].map(clock => {
        fx.update(clock, barrel)
        return fx.swell.at.value
      })
      expect(swells).toEqual(swells.toSorted((a, b) => a - b))
      expect(fx.swell.size.value).toBeGreaterThan(0.2)
      expect(barrel.scale.y).toBeLessThan(1)
      expect(barrel.scale.x).toBeGreaterThan(1)
      expect(fx.blast.uniforms.clock.value).toBeGreaterThan(10)
      fx.fire(1 + charging, halloween)
      fx.update(1 + charging + 0.02, barrel)
      expect(barrel.scale.y).toBeGreaterThan(1.1)
      expect(barrel.scale.x).toBeLessThan(1)
      expect(fromBreech()).toBeGreaterThan(0.02)
      expect(fx.swell.at.value).toBe(alchemyCannon.length)
      expect(fx.blast.uniforms.clock.value).toBeCloseTo(0.02, 9)
      expect(bats.uniforms.clock.value).toBeCloseTo(0.02, 9)
      fx.update(1 + charging + 3, barrel)
      for (const value of [barrel.scale.x, barrel.scale.y, barrel.scale.z]) {
        expect(value).toBeCloseTo(1, 6)
      }
      expect(fromBreech()).toBe(0)
      expect(fx.swell.size.value).toBe(0)
      // Once the bats have flown off, they are gone.
      fx.update(1 + charging + halloweenOrb.effect.afterglow + 1.5, barrel)
      expect(fx.root.children).toEqual([fx.blast])
    } finally {
      fx.dispose()
    }
  })
})
describe('the Bastion’s cistern', () => {
  const [grilleX, wallZ] = cisternGrille.center
  const {bottom, rim} = cisternChannel
  const lipZ = climbCulvert.z + wallFace + cisternChannel.lip
  test('its channel starts behind the grille on the vestibule’s axis, turns 180° counter-clockwise round the cistern’s floor and runs straight out south through the culvert on the run’s axis, falling evenly all along', () => {
    const start = cisternChannel.at(0)
    expect(start.point[0]).toBeCloseTo(grilleX, 9)
    expect(start.point[2]).toBeCloseTo(cisternGrille.channelZ, 9)
    expect(start.direction[0]).toBeCloseTo(0, 9)
    expect(start.direction[2]).toBeLessThan(-0.99)
    const middle = cisternChannel.at(cisternChannel.turn.end / 2)
    expect(middle.point[0]).toBeCloseTo(cisternChannel.turn.center[0], 9)
    expect(middle.direction[0]).toBeLessThan(-0.99)
    const end = cisternChannel.at(cisternChannel.turn.end)
    expect(end.point[0]).toBeCloseTo(climbCulvert.x, 9)
    expect(end.point[2]).toBeCloseTo(cisternGrille.channelZ, 9)
    expect(end.direction[2]).toBeGreaterThan(0.99)
    for (let along = cisternChannel.turn.end; along <= cisternChannel.length; along += 0.05) {
      expect(cisternChannel.at(along).point[0]).toBeCloseTo(climbCulvert.x, 9)
    }
    expect(cisternChannel.at(cisternChannel.crossing).point[2]).toBeCloseTo(wallZ, 9)
    expect(cisternChannel.at(cisternChannel.length).point[2]).toBeCloseTo(lipZ, 9)
    // Evenly, steeply enough for an orb set down in it to roll off at 0.4 m/s within 2.5 s, before Rapier lets it fall asleep, its bottom a few centimeters over the culvert’s sill at its lip
    expect(9.81 * cisternChannel.fall * 5 / 7 * 2.5).toBeGreaterThan(0.4)
    for (let along = 0; along <= cisternChannel.length; along += 0.5) {
      expect(bottom(along) - bottom(along + 0.5)).toBeCloseTo(cisternChannel.fall * 0.5, 9)
    }
    expect(bottom(cisternChannel.length) - climbCulvert.bottom).toBeCloseTo(0.04, 9)
    // An orb in it passes under the culvert’s head.
    expect(bottom(cisternChannel.crossing) + orbRadius * 2 + 0.05).toBeLessThan(climbCulvert.height)
    // Sunk into the floor all round, its sides as high as the floor beside it where it leaves, so the floor carries whatever lies on it into it
    for (let along = 0; along <= cisternChannel.turn.end; along += 0.05) {
      expect(cistern.apronEdge(along)).toBeGreaterThanOrEqual(rim(along) - 1e-9)
    }
    expect(cistern.apronEdge(cisternChannel.turn.end)).toBeCloseTo(rim(cisternChannel.turn.end), 9)
    expect(cistern.apronEdge(0)).toBe(cisternGrille.sill)
  })
  test('its backstop stands over the channel right behind the grille, its iron face square to the shot where the orb strikes it, with room for the orb to drift on under it', () => {
    const [x, y, z] = cisternBackstop.face
    const [depth, width, height] = cisternBackstop.size
    expect(x).toBe(grilleX)
    const strike = crossing(z + orbRadius)
    expect(strike[1]).toBeCloseTo(y, 6)
    expect(cisternBackstop.impact[1]).toBeCloseTo(y, 9)
    // The orb meets its face, not the edge under it, and not over its top.
    expect(y - cisternBackstop.underside).toBeGreaterThan(0.05)
    expect(cisternBackstop.underside + height - y).toBeGreaterThan(orbRadius + 0.05)
    expect(width / 2).toBeGreaterThan(cisternChannel.bore + 0.2)
    // It lies on the floor beside the channel, and the orb drifts under it.
    for (let along = z; along >= z - depth; along -= 0.02) {
      const at = cisternGrille.channelZ - along
      expect(bottom(at) + orbRadius * 2 + 0.04).toBeLessThan(cisternBackstop.underside)
      expect(cistern.apronEdge(at)).toBeGreaterThanOrEqual(cisternBackstop.underside - 1e-9)
    }
  })
  test('the grille opens through the vestibule’s round wall and the cistern’s flat wall where they touch, under the same arch, its cells wide enough for an orb', () => {
    const ring = wallById('forge-vestibule')
    const flat = wallById('bastion-cistern_flat')
    const inRing = ring.holes!.find(hole => hole.name === 'cistern')!
    const inFlat = flat.holes!.find(hole => hole.name === 'vestibule')!
    for (const [wall, hole] of [[ring, inRing], [flat, inFlat]] as const) {
      const [x, , z] = wallPosition(wall, hole.u, 0, 0)
      expect(x).toBeCloseTo(grilleX, 9)
      expect(z).toBeCloseTo(wallZ, 9)
      expect([hole.profile, hole.casing]).toEqual(['arch', false])
      // Through the round wall a hair lower and higher, under and over the reveal lining it on from the flat wall
      const tuck = wall.curveRadius ? 0.003 : 1e-9
      expect(Math.abs(hole.bottom! - cisternGrille.sill)).toBeLessThan(tuck)
      expect(Math.abs(hole.height - cisternGrille.spring - cisternGrille.rise)).toBeLessThan(tuck)
      expect(hole.height - hole.rise!).toBeCloseTo(cisternGrille.spring, 9)
      const [left, right] = [-1, 1].map(side => wallPosition(wall, hole.u + side * hole.width / 2, 0, 0))
      expect(Math.abs(left[0] - right[0])).toBeCloseTo(cisternGrille.width, 9)
    }
    // How far the round wall’s center line stands behind the flat wall’s at the jambs
    const jamb = wallPosition(ring, inRing.u + inRing.width / 2, 0, 0)
    expect(jamb[2] - wallZ).toBeCloseTo(cisternGrille.gap, 9)
    // Square cells, wide enough for an orb with room to spare, the bars and the bands between them
    expect(cisternGrille.pitch - barRadius * 2 - orbRadius * 2).toBeGreaterThan(0.1)
    expect(cisternGrille.pitch - bandHeight - orbRadius * 2).toBeGreaterThan(0.1)
    expect(cisternGrille.bands).toEqual([cisternGrille.sill + cisternGrille.pitch, cisternGrille.sill + cisternGrille.pitch * 2])
    expect(openings.filter(({rooms: pair}) => pair.includes('forge') && pair.includes('bastion')).map(({holes}) => holes)).toEqual([[['forge-vestibule', 'bastion']], [['forge-vestibule', 'cistern']]])
  })
  test('its culvert opens through its flat wall and the approach’s north wall back to back, low on the run’s axis, wide and high enough for the channel’s stone and an orb drifting in it', () => {
    const approach = climbApproach.walls.find(wall => wall.holes?.some(hole => hole.name === 'cistern'))!
    const flat = wallById('bastion-cistern_flat')
    const fromApproach = approach.holes!.find(hole => hole.name === 'cistern')!
    const fromCistern = flat.holes!.find(hole => hole.name === 'approach')!
    for (const [wall, hole] of [[approach, fromApproach], [flat, fromCistern]] as const) {
      const [x, , z] = wallPosition(wall, hole.u, 0, 0)
      expect(x).toBeCloseTo(climbCulvert.x, 9)
      expect(z).toBeCloseTo(climbCulvert.z, 9)
      expect(wall.center[1]).toBe(0)
      expect([hole.profile, hole.casing, hole.width, hole.bottom, hole.height]).toEqual(['rectangle', false, climbCulvert.width, climbCulvert.bottom, climbCulvert.height])
    }
    expect(climbCulvert.width / 2 - cisternChannel.bore).toBeGreaterThan(0.1)
    expect(climbCulvert.height - climbCulvert.bottom).toBeLessThan(0.6)
    // Facing down the run, its middle on the run’s axis
    expect(approach.rotation).toBeCloseTo(0, 9)
    expect(climbCulvert.x).toBe(climbRun.route.end.point[0])
  })
  test('its floor falls toward the channel from everywhere, so whatever lands on it rolls into the channel and out through the culvert, as does whatever lands in the channel', () => {
    const colliders = forgeAndBastionColliders()
    const [cx, cz] = cisternChannel.turn.center
    const stuck: Array<Vec3> = []
    for (const out of [0.3, 1.5, 2.6, 3.5, cisternChannel.turn.radius, 4.9, 5.6]) {
      for (const angle of [0.08, 0.4, 0.9, 1.5, 2.1, 2.7, 3.06]) {
        // In the channel, past the backstop
        const turned = out === cisternChannel.turn.radius ? Math.max(angle, 0.2) : angle
        const [x, z] = [cx + Math.cos(turned) * out, cz - Math.sin(turned) * out]
        const drop: Vec3 = [x, cisternFloorHeight(x, z) + orbRadius + 0.1, z]
        const world = physicsWorld(colliders)
        try {
          const body = addOrb(world, drop)
          let left = false
          for (let step = 0; step < 60 * 60 && !left; step++) {
            world.step()
            const position = body.translation()
            left = position.z > lipZ && Math.abs(position.x - climbCulvert.x) < climbCulvert.width / 2
          }
          if (!left) {
            stuck.push(drop)
          }
        } finally {
          world.free()
        }
      }
    }
    expect(stuck).toEqual([])
  }, 120_000)
  test('its walls stand on its floor, their baseboards following it as it falls toward the channel', () => {
    const material = new MeshBasicMaterial
    try {
      for (const id of ['bastion-cistern_flat', 'bastion-cistern_round']) {
        const wall = wallById(id)
        expect(wall.baseboardProfile).toBeDefined()
        const geometry = createArchitectureGeometry(wall)
        try {
          const trim = new Mesh(geometry.trim[0], material)
          for (let step = 1; step < 40; step++) {
            const u = wall.width * (step / 40 - 0.5)
            // Clear of the culvert, which cuts through the baseboard
            if (wall.holes?.some(hole => Math.abs(u - hole.u) < hole.width / 2 + 0.3)) {
              continue
            }
            const [x, , z] = wallPosition(wall, u, 0, wallFace)
            const floor = cisternFloorHeight(x, z)
            // 23 cm out of its center line, over the baseboard’s cap
            const [localX, localZ] = wall.curveRadius ? [(wall.curveRadius - 0.23) * Math.sin(u / wall.curveRadius), wall.curveRadius - (wall.curveRadius - 0.23) * Math.cos(u / wall.curveRadius)] : [u, 0.23]
            const down = new Raycaster(new Vector3(localX, floor + 1, localZ), new Vector3(0, -1, 0), 0, 2)
            expect(down.intersectObject(trim)[0].point.y).toBeCloseTo(floor + bastionBaseboard.baseboardHeight, 1)
          }
        } finally {
          geometry.dispose()
        }
      }
    } finally {
      material.dispose()
    }
  })
  test('belongs to the Bastion, which holds it from its floor to its half dome’s crown', () => {
    const [cx, cz] = cistern.center
    for (const [dx, dz] of [[0, -0.5], [-5, -1], [4.5, -2], [0, -5.5], [-2.5, -3]]) {
      const [x, z] = [cx + dx, cz + dz]
      const floor = cisternFloorHeight(x, z)
      expect(roomAt([x, floor + 1.6, z])).toBe('bastion')
      expect(floorHeight([x, floor + 1.6, z])).toBeCloseTo(floor, 9)
      expect(insideGallery([x, cistern.crown - 0.1, z])).toBe(true)
    }
    // The vestibule stays the Forge’s, right up to its wall.
    expect(roomAt([grilleX, 1.6, wallZ + 0.3])).toBe('forge')
    expect(roomAt([grilleX, 1.6, wallZ - 0.3])).toBe('bastion')
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
    expect(transmutedOrb(transparentOrb, [['prop-hatchet', [forge.center[0], 1, forge.center[1]]]], roomAt, 0.3)).toBe(horrorOrb)
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
  test('gives it the flavor of a pumpkin, a hatchet or a helmet lying in the Forge or carried into it, and of those there one at random, but heeds neither them outside it nor other props in it', () => {
    const inForge: Vec3 = [forge.center[0], 1, forge.center[1]]
    const inVestibule: Vec3 = [forgeVestibule.center[0], 1.4, forgeVestibule.center[1]]
    const inLobby: Vec3 = [0, 1, -20]
    expect(roomAt(inVestibule)).toBe('forge')
    expect(roomAt(inLobby)).not.toBe('forge')
    expect([pumpkin, hatchet, helmet].map(curio => curio.propId)).toEqual(['prop-pumpkin', 'prop-hatchet', 'prop-helmet'])
    expect(flavorCandidates([['prop-pumpkin', inForge]], roomAt)).toEqual([halloweenOrb])
    expect(flavorCandidates([['prop-hatchet', inVestibule]], roomAt)).toEqual([horrorOrb])
    expect(flavorCandidates([['prop-knife', inForge]], roomAt)).toBe(randomOrbs)
    expect(flavorCandidates([['prop-helmet-2', inForge]], roomAt)).toEqual([spookOrb])
    // Where they lie when a game begins, none of them is in the Forge yet.
    expect(flavorCandidates([pumpkin, hatchet, helmet].map(curio => [curio.propId, curio.position] as const), roomAt)).toBe(randomOrbs)
    // Several of a kind steer it no harder than one.
    expect(flavorCandidates([['prop-pumpkin', inForge], ['prop-pumpkin-2', inForge], ['prop-hatchet', inForge]], roomAt)).toEqual([halloweenOrb, horrorOrb])
    expect([0, 0.49, 0.5, 0.99].map(random => flavoredOrb([['prop-pumpkin', inForge], ['prop-hatchet', inForge]], roomAt, random))).toEqual([halloweenOrb, halloweenOrb, horrorOrb, horrorOrb])
    expect(flavorCandidates([['prop-pumpkin', inLobby], ['prop-cube', inForge], ['prop-pumpkinseed', inForge], [halloweenOrb.propId, inForge]], roomAt)).toBe(randomOrbs)
  })
  test('scattered cannon shots pass the arch and the grille untouched, drop dead at the cistern’s backstop into its channel, drift out through the culvert and travel on down the Bastion to its crater, never dragged across the welded surfaces', () => {
    const colliders = forgeAndBastionColliders()
    const state = mulberry32.create(7)
    const scatter = (size: number) => (mulberry32.sample(state) * 2 - 1) * size
    const {hatch, wall} = bastionLinkGate
    const [hatchX, gateZ] = [wall.center[0] + hatch.u, wall.center[2]]
    const shots = 20
    const backstopZ = cisternBackstop.face[2] + orbRadius
    const lipZ = climbCulvert.z + wallFace + cisternChannel.lip
    const exitSpeeds: Array<number> = []
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
        let struck = false
        let stopped = false
        let exited = false
        let atGate: number | undefined
        let previousZ = Infinity
        let previous = body.translation()
        for (let step = 0; step < 60 * 60; step++) {
          const before = body.linvel()
          world.step()
          const position = body.translation()
          const velocity = body.linvel()
          const pace = Math.hypot(velocity.x, velocity.y, velocity.z)
          // Flying freely right up to the backstop, gravity alone changing its velocity, until it strikes it, which stops its flight dead: sliding down its face through the rest of that step, it may glance off its foot a little.
          if (!struck && Math.hypot(velocity.x - before.x, velocity.z - before.z) > 1e-6) {
            struck = true
            if (Math.abs(position.z - backstopZ) > 0.03 || Math.abs(before.z) < 15) {
              untouched = false
            }
            stopped = Math.abs(velocity.z) < 0.05 && Math.hypot(velocity.x, velocity.z) < 1
          }
          if (struck && !exited && position.z > lipZ && Math.abs(position.x - climbCulvert.x) < climbCulvert.width / 2) {
            exited = true
            exitSpeeds.push(pace)
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
        expect(stopped).toBe(true)
        expect(exited).toBe(true)
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
    // Out of the culvert, they come at a walking pace, the channel’s fall all they gained.
    expect(Math.min(...exitSpeeds)).toBeGreaterThan(1)
    expect(Math.max(...exitSpeeds)).toBeLessThan(4)
    expect(through).toBeGreaterThanOrEqual(shots * 0.9)
    expect(caught).toBeGreaterThanOrEqual(through * 0.8)
    // but where they strike something
    expect(dragged / rolling).toBeLessThan(0.02)
  }, 120_000)
})
