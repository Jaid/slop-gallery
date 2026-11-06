import type {Orb} from '../../src/lib/gallery/orbs/index.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {mulberry32} from 'math/random'
import {Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector3} from 'three/webgpu'

import {alchemyCannon, alchemyPipe, alchemySink, cannonFlight, cannonLaunch, cannonTarget, holderSpot, inSinkThroat, machineBody, southWallFace, workbench} from '../../src/lib/gallery/alchemy/alchemyMachine.ts'
import CannonGeometry from '../../src/lib/gallery/alchemy/CannonGeometry.ts'
import {flavorCandidates, flavoredOrb, orbAround, transmutedOrb} from '../../src/lib/gallery/alchemy/flavor.ts'
import MachineBodyGeometry from '../../src/lib/gallery/alchemy/MachineBodyGeometry.ts'
import PipeGeometry from '../../src/lib/gallery/alchemy/PipeGeometry.ts'
import SinkGeometry from '../../src/lib/gallery/alchemy/SinkGeometry.ts'
import WorkbenchGeometry from '../../src/lib/gallery/alchemy/WorkbenchGeometry.ts'
import {colliderGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {bastionCrater} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {climbApproach} from '../../src/lib/gallery/climb.ts'
import {helmet, knife, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import forge, {forgeRooflight, forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeTurn, forgeTurnHoleHalfWidth} from '../../src/lib/gallery/forgeTurn.ts'
import ForgeTurnGeometry from '../../src/lib/gallery/ForgeTurnGeometry.ts'
import {orbSeat} from '../../src/lib/gallery/OrbHolderGeometry.ts'
import {halloweenOrb, horrorOrb, orbRadius, randomOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'
import {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {weldedSurfaceSkin} from '../../src/lib/physics/weldedSurface.ts'
import {insideOpening, openingCircle, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import CannonFx, {charging} from '../../src/rooms/forge/components/AlchemyMachine/CannonFx.ts'
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
const flight = cannonFlight.points
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
  test('shoots an orb along its barrel, from a step down it, under the rooflight’s ring and the ceiling across the Forge, through the arch over the middle of its threshold, and into the middle of the redirection pipe’s mouth', () => {
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
    const crossing = (z: number) => {
      const index = flight.findIndex(point => point[2] < z)
      const [before, after] = [flight[index - 1], flight[index]]
      const share = (before[2] - z) / (before[2] - after[2])
      return before[1] + (after[1] - before[1]) * share
    }
    expect(crossing(northZ)).toBeCloseTo(cannonTarget.arch[1], 3)
    // Its last step falls short of the mouth by less than a step.
    const last = flight.at(-1)!
    expect(last[2]).toBeGreaterThan(cannonTarget.mouth[2])
    expect(last[2] - cannonTarget.mouth[2]).toBeLessThan(Math.abs(cannonLaunch.velocity[2]) / 60)
    expect(cannonFlight.fall).toBeGreaterThan(0)
  })
  test('Rapier flies an orb shot out of it along the very steps its aim follows, into the pipe’s mouth', () => {
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
  test('the orb passes the arch between the Forge and its vestibule well clear of its crown, and no wall has an opening of its own for it anymore', () => {
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
describe('the Forge’s redirection pipe', () => {
  const [vestibuleX, vestibuleZ] = forgeVestibule.center
  const outside = forgeTurn.bore + forgeTurn.thickness
  const fromMiddle = ([x, , z]: Vec3) => Math.hypot(x - vestibuleX, z - vestibuleZ)
  test('takes the cannon shot north, turns just 180° counter-clockwise, then returns straight south through the marked Bastion approach wall', () => {
    expect(forgeTurn.bore - orbRadius - weldedSurfaceSkin).toBeGreaterThan(0.05)
    const mouth = forgeTurn.at(0)
    // Its middle as far over the orb’s as the orb rests under it on the bottom of its bore, square to the way both run
    const offset = mouth.point.map((value, axis) => value - cannonTarget.mouth[axis])
    expect(Math.hypot(...offset)).toBeCloseTo(forgeTurn.slack, 9)
    expect(offset.reduce((sum, value, axis) => sum + value * mouth.direction[axis], 0)).toBeCloseTo(0, 9)
    expect(forgeTurn.slack).toBeLessThan(forgeTurn.bore - orbRadius - weldedSurfaceSkin)
    expect(mouth.direction[0]).toBe(0)
    expect(-mouth.direction[1] / -mouth.direction[2]).toBeCloseTo(cannonFlight.fall, 9)
    expect(mouth.point[1]).toBeLessThan(1)
    const outlet = forgeTurn.at(forgeTurn.length)
    const bendStart = forgeTurn.at(forgeTurn.bend.start)
    const bendMid = forgeTurn.at((forgeTurn.bend.start + forgeTurn.bend.end) / 2)
    const bendEnd = forgeTurn.at(forgeTurn.bend.end)
    expect(bendStart.direction[2] / Math.hypot(bendStart.direction[0], bendStart.direction[2])).toBeCloseTo(-1, 9)
    expect(bendMid.point[0]).toBeLessThan(vestibuleX)
    expect(bendMid.direction[0]).toBeLessThan(-0.99)
    expect(bendEnd.direction[2] / Math.hypot(bendEnd.direction[0], bendEnd.direction[2])).toBeCloseTo(1, 9)
    expect(bendEnd.point[0]).toBeCloseTo(vestibuleX - forgeTurn.bend.radius * 2, 9)
    expect(outlet.point[2]).toBeCloseTo(vestibuleZ + 0.19, 9)
    expect(outlet.point[0]).toBeLessThan(vestibuleX)
    expect(outlet.direction[0]).toBeCloseTo(0, 9)
    expect(outlet.direction[2]).toBeGreaterThan(0.99)
    expect(outlet.direction[1]).toBeLessThan(0)
    expect(climbApproach.route.end.point[1]).toBeCloseTo(vestibuleZ, 9)
    // Its brass clears the floor at its outlet, where an orb drops out onto the floor.
    expect(outlet.point[1] - outside).toBeGreaterThan(0.02)
    expect(outlet.point[1]).toBeCloseTo(0.63, 9)
    // The hairpin and straight return stay outside the vestibule wall after the inlet, without ever rising.
    let previousY = Infinity
    for (let along = 0; along <= forgeTurn.length; along += 0.02) {
      const {point} = forgeTurn.at(along)
      const distance = fromMiddle(point)
      if (along < forgeTurn.faces.inlet) {
        expect(distance).toBeLessThan(forgeVestibule.radius - wallFace)
      } else if (along > forgeTurn.crossings.inlet + 0.6) {
        expect(distance - outside).toBeGreaterThan(forgeVestibule.radius + wallFace)
      }
      expect(point[1]).toBeLessThan(previousY)
      expect(point[1] - outside).toBeGreaterThan(0)
      previousY = point[1]
    }
    // The first crossing is radial in the vestibule wall. The second is in the curved Bastion approach wall at the marked point.
    const inletCrossing = forgeTurn.at(forgeTurn.crossings.inlet)
    expect(fromMiddle(inletCrossing.point)).toBeCloseTo(forgeVestibule.radius, 9)
    const outletCrossing = forgeTurn.at(forgeTurn.crossings.outlet)
    const approachWall = climbApproach.walls[0]
    const opening = approachWall.holes!.find(hole => hole.name === 'pipe_outlet')!
    const marked = wallPosition(approachWall, opening.u, outletCrossing.point[1], 0)
    expect(Math.hypot(outletCrossing.point[0] - marked[0], outletCrossing.point[2] - marked[2])).toBeLessThan(0.01)
    expect(outletCrossing.point[1]).toBeCloseTo(((opening.bottom ?? 0) + opening.height) / 2, 9)
    expect(outletCrossing.direction[2]).toBeGreaterThan(0.99)
    const markedFace = wallPosition(approachWall, opening.u, outletCrossing.point[1], wallFace)
    expect(Math.hypot(markedFace[0] + 22.228, markedFace[2] + 35.004)).toBeLessThan(0.01)
    // The return leg has no additional bends after the semicircle.
    for (let along = forgeTurn.bend.end; along <= forgeTurn.length; along += 0.1) {
      const {direction, point} = forgeTurn.at(along)
      expect(point[0]).toBeCloseTo(outlet.point[0], 9)
      expect(direction[0]).toBeCloseTo(0, 9)
      expect(direction[2]).toBeGreaterThan(0.99)
    }
    // Both its ends lie open.
    const material = new MeshBasicMaterial
    try {
      const mesh = new Mesh(turnPipe.pipe, material)
      mesh.updateMatrixWorld()
      for (const along of [0, forgeTurn.length]) {
        const {direction, point} = forgeTurn.at(along)
        const ray = new Vector3(...direction)
        ray.multiplyScalar(along ? -1 : 1)
        const origin = new Vector3(...point)
        origin.addScaledVector(ray, -0.1)
        const caster = new Raycaster(origin, ray, 0, 0.2)
        expect(caster.intersectObject(mesh)).toHaveLength(0)
      }
    } finally {
      material.dispose()
    }
  })
  test('cuts only the plated inlet in the vestibule and the outgoing hole in the Bastion approach wall', () => {
    const ring = wallById('forge-vestibule')
    expect(ring.holes!.filter(hole => hole.name?.startsWith('pipe')).map(hole => hole.name)).toEqual(['pipe_inlet'])
    const inlet = ring.holes!.find(hole => hole.name === 'pipe_inlet')!
    expect([inlet.profile, inlet.casing]).toEqual(['round', false])
    expect(openingCircle(inlet).radius).toBeCloseTo(forgeTurnHoleHalfWidth(), 9)
    expect(ring.center[1] + openingCircle(inlet).center).toBeCloseTo(forgeTurn.at(forgeTurn.crossings.inlet).point[1], 9)
    expect(inlet.bottom! - 0.04).toBeGreaterThan(ring.baseboardHeight ?? 0.44)
    const approach = wallById('bastion-climb_approach_wall_0')
    const exit = approach.holes!.find(hole => hole.name === 'pipe_outlet')!
    expect([exit.profile, exit.casing]).toEqual(['round', false])
    const {center, radius} = openingCircle(exit)
    expect(radius).toBeCloseTo(0.38, 9)
    expect(center).toBeCloseTo(forgeTurn.at(forgeTurn.crossings.outlet).point[1], 9)
    expect(exit.bottom!).toBeGreaterThan(0.25)
    for (const crossing of ['inlet', 'outlet'] as const) {
      const wall = crossing === 'inlet' ? ring : approach
      const hole = crossing === 'inlet' ? inlet : exit
      const stretch = Math.hypot(1, forgeTurn.fall(forgeTurn.crossings[crossing]))
      for (const offset of [-wallFace, 0, wallFace]) {
        const {point} = forgeTurn.at(forgeTurn.crossings[crossing] + offset)
        const u = wallCoordinates(wall, point)
        for (const [du, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          expect(insideOpening(hole, u + du * outside, point[1] - wall.center[1] + dy * outside * stretch)).toBe(true)
        }
      }
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
  test('scattered cannon shots pass the arch untouched, keep over half their speed round the redirection pipe and travel on down the Bastion to its crater, never dragged across the welded surfaces', () => {
    const colliders = forgeAndBastionColliders()
    const state = mulberry32.create(7)
    const scatter = (size: number) => (mulberry32.sample(state) * 2 - 1) * size
    const {hatch, wall} = bastionLinkGate
    const [hatchX, gateZ] = [wall.center[0] + hatch.u, wall.center[2]]
    const shots = 20
    const outlet = forgeTurn.at(forgeTurn.length).point
    const ratios: Array<number> = []
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
          if (!entered && position.z > cannonTarget.mouth[2] && Math.hypot(velocity.x - before.x, velocity.z - before.z) > 1e-6) {
            untouched = false
          }
          const pace = Math.hypot(velocity.x, velocity.y, velocity.z)
          if (!entered && position.z <= cannonTarget.mouth[2]) {
            entered = true
            inletSpeed = pace
          }
          if (entered && !exited && position.z > outlet[2] - 0.08 && Math.abs(position.x - outlet[0]) < 0.5 && position.y < outlet[1] + 0.3) {
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
        ratios.push(exitSpeed / inletSpeed)
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
    // Over the floor, the orbs roll on with over half the speed they flew in with.
    expect(Math.min(...ratios)).toBeGreaterThan(0.5)
    expect(through).toBeGreaterThanOrEqual(shots * 0.9)
    expect(caught).toBeGreaterThanOrEqual(through * 0.8)
    // but where they strike something
    expect(dragged / rolling).toBeLessThan(0.02)
  }, 120_000)
})
