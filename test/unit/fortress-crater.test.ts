import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor, {defaultEgoOptions} from 'ego-player/motor'
import {mulberry32} from 'math/random'
import {DoubleSide, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionApproach, bastionRun} from '../../src/lib/gallery/bastion.ts'
import {slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressCrater, fortressCurve, fortressGuardStone, fortressLinkStart} from '../../src/lib/gallery/fortress.ts'
import {rubbleShelf} from '../../src/lib/gallery/FortressCraterGeometry.ts'
import {fortressLink, fortressNetwork} from '../../src/lib/gallery/fortressNetwork.ts'
import {orbRadius} from '../../src/lib/gallery/orbs/index.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import RouteVaultGeometry, {pavingThickness} from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {vesperOrbPedestals} from '../../src/lib/gallery/vesper.ts'
import GrabbableBody from '../../src/lib/physics/GrabbableBody.ts'
import walls from './fixtures/gallery.ts'
import {addFortressCrater, fortressCraterGeometry} from './helpers/fortressCrater.ts'

await RAPIER.init()
const architecture = walls.filter(wall => wall.room === 'fortress').map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const vaults = fortressNetwork.map(passage => (passage instanceof Passage ? new VaultGeometry(passage) : new RouteVaultGeometry(passage)))
const curve = vaults[fortressNetwork.indexOf(fortressCurve)] as RouteVaultGeometry
afterAll(() => {
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
  for (const vault of vaults) {
    vault.dispose()
  }
})
const [centerX, floorY, centerZ] = fortressCrater.center
/** how far the crater’s broken edge reaches from its middle, at most */
const reach = Math.max(...fortressCrater.outline.map(([x, z]) => Math.hypot(x - centerX, z - centerZ)))
/** The Fortress’ passages and walls as the game builds their colliders, with the crater and its guard stone. */
function fortressWorld() {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 60
  // what `<Physics>` of @react-three/rapier sets by default
  Object.assign(world.integrationParameters, {
    normalizedAllowedLinearError: 0.001,
    normalizedPredictionDistance: 0.002,
  })
  for (const {wall, geometry} of architecture) {
    const rotation = new Quaternion
    rotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)
    for (const args of geometry.collision) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation(rotation))
    }
  }
  for (const [index, passage] of fortressNetwork.entries()) {
    const vault = vaults[index]
    for (const geometry of [vault.shell, vault.ribs, ...vault instanceof RouteVaultGeometry ? [vault.paving] : []]) {
      if (geometry.hasAttribute('position')) {
        world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
      }
    }
    // A straight passage’s floor and ceiling are slabs of their own, see CoveredPassage.
    if (!(passage instanceof Passage)) {
      continue
    }
    const crown = passage.floorY + passage.height
    for (const floor of passage.floors) {
      world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, passage.floorY - 0.24, passage.floorY))!)
      world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, crown, crown + 0.24))!)
    }
  }
  addFortressCrater(world)
  return world
}
/** Whether an orb at the position lies in the crater, inside its broken edge and sunk into it by half its radius at least, on the rubble or on other orbs. */
const inCrater = ({x, y, z}: {
  x: number
  y: number
  z: number
}) => y < floorY + orbRadius / 2 && Math.hypot(x - centerX, z - centerZ) < reach
test('the crater breaks through the landing’s paving on the link’s axis, 1.6 m out from its doorway', () => {
  expect(centerX).toBe(fortressLinkStart.point[0])
  expect(centerZ).toBeCloseTo(fortressLinkStart.point[1] - 1.6, 9)
  expect(floorY).toBe(fortressLinkStart.y)
  expect(fortressCurve.pits).toEqual([fortressCrater.outline])
  const material = new MeshBasicMaterial({side: DoubleSide})
  const paving = new Mesh(curve.paving, material)
  const rubble = new Mesh(fortressCraterGeometry.rubble, material)
  rubble.position.set(...fortressCrater.center)
  rubble.updateMatrixWorld()
  try {
    const down = (x: number, z: number) => new Raycaster(new Vector3(x, floorY + 1, z), new Vector3(0, -1, 0))
    // Nothing but rubble inside its edge, the depth of its middle under the floor there
    const middle = down(centerX, centerZ)
    expect(middle.intersectObject(paving)).toHaveLength(0)
    expect(middle.intersectObject(rubble)[0].point.y).toBeCloseTo(floorY - fortressCrater.depth, 2)
    for (const [x, z] of fortressCrater.outline) {
      const out = Math.hypot(x - centerX, z - centerZ)
      const [dx, dz] = [(x - centerX) / out, (z - centerZ) / out]
      expect(down(centerX + dx * (out - 0.05), centerZ + dz * (out - 0.05)).intersectObject(paving)).toHaveLength(0)
      // Just outside it, the paving’s floor and its slab’s underside, as everywhere else
      const outside = down(centerX + dx * (out + 0.05), centerZ + dz * (out + 0.05)).intersectObject(paving).map(hit => hit.point.y)
      expect(outside[0]).toBeCloseTo(floorY, 6)
      expect(outside.at(-1)).toBeCloseTo(floorY - pavingThickness, 6)
    }
  } finally {
    material.dispose()
  }
  expect(reach).toBeLessThan(fortressCrater.radius * 1.15)
  expect(Math.min(...fortressCrater.outline.map(([x, z]) => Math.hypot(x - centerX, z - centerZ)))).toBeGreaterThan(fortressCrater.radius * 0.85)
})
test('the rubble meets the broken edge at the paving’s underside, and the broken ends of the tipped flags hang too high over it for an orb that fell in to roll back out, but low enough for a player to step out', () => {
  const position = fortressCraterGeometry.rubble.getAttribute('position')
  const corners = fortressCrater.outline.map(([x, z]) => [x - centerX, z - centerZ])
  const rim = Array.from({length: position.count}, (_, i) => i).filter(i => corners.some(([x, z]) => Math.hypot(position.getX(i) - x, position.getZ(i) - z) < 1e-6))
  expect(rim).toHaveLength(corners.length)
  for (const i of rim) {
    expect(position.getY(i)).toBeCloseTo(-pavingThickness, 6)
  }
  for (const part of [fortressCraterGeometry.rubble, fortressCraterGeometry.shards]) {
    part.computeBoundingBox()
    expect(part.boundingBox!.max.y).toBeLessThan(-orbRadius - 0.05)
  }
  expect(fortressCraterGeometry.drops.length).toBeGreaterThan(corners.length / 3)
  for (const drop of fortressCraterGeometry.drops) {
    expect(rubbleShelf - drop).toBeGreaterThan(orbRadius * 1.25)
    expect(rubbleShelf - drop).toBeLessThan(defaultEgoOptions.stepHeight - 0.03)
  }
  // Tipped into the crater, the flags reach no higher than a little over the floor where they bend up with its edge.
  fortressCraterGeometry.flags.computeBoundingBox()
  expect(fortressCraterGeometry.flags.boundingBox!.max.y).toBeLessThan(0.03)
})
test('the guard stone runs along the face of the link’s east wall, the outside of its last corner, and narrows its doorway, standing higher than an orb', () => {
  const [start, wallEnd, tip] = fortressGuardStone.corners
  const eastFace = fortressLinkStart.point[0] + fortressLink.width / 2 - wallFace
  expect(start[0]).toBeCloseTo(eastFace, 9)
  expect(wallEnd[0]).toBeCloseTo(eastFace, 9)
  // The tunnel turns left out of the strip into its run north to the doorway, so its east wall is the outside of that corner.
  expect(fortressLink.route.pieces[1].kind).toBe('arc')
  expect(start[1]).toBeGreaterThan(wallEnd[1])
  expect(tip[1]).toBe(wallEnd[1])
  // It leaves the doorway more than 2.5 m wide at the floor.
  expect(tip[0] - (fortressLinkStart.point[0] - fortressLink.width / 2 + wallFace)).toBeGreaterThan(2.5)
  expect(fortressGuardStone.top - floorY).toBeGreaterThan(orbRadius * 2.5)
  expect(fortressGuardStone.bottom).toBeLessThan(floorY)
})
/**
 * Throws an orb at each of the points, 1.5 s apart, from where the climb’s approach turns east toward the Cinnabar, a little off its corner, as high as a player’s eyes, looking back south through the screen’s arch down the run; `apart`, they pass through each other.
 * Returns whether each lies down in the crater 45 s after the last throw, at rest.
 */
function throwDownTheClimb(aims: ReadonlyArray<Vec3>, apart = false) {
  const world = fortressWorld()
  try {
    world.step()
    const [cornerX, cornerZ] = bastionApproach.path[1]
    const eye: Vec3 = [cornerX + 0.6, bastionApproach.floorY + 1.6, cornerZ - 0.7]
    const orbs = aims.map((_, index) => {
      // parked far off until thrown, as GrabbableProp’s ball: 1.8 kg, friction 0.8 and restitution 0.32
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(index * 2, 100, 0).setCcdEnabled(true))
      const ball = RAPIER.ColliderDesc.ball(orbRadius).setMass(1.8).setFriction(0.8).setRestitution(0.32)
      // Apart, each is the only member of the second group, which meets only the first, where everything else is.
      world.createCollider(apart ? ball.setCollisionGroups(0x2 << 16 | 0x1) : ball, body)
      return body
    })
    /** how many steps apart the orbs are thrown */
    const interval = 90
    for (let step = 0; step < interval * orbs.length + 60 * 45; step++) {
      const index = step / interval
      if (Number.isInteger(index) && index < orbs.length) {
        const carried = new GrabbableBody(orbs[index], world)
        expect(carried.grab()).toBe(true)
        const line = aims[index].map((value, axis) => value - eye[axis])
        const length = Math.hypot(...line)
        const direction = line.map(value => value / length) as Vec3
        // Let go of like GrabbableProp: from inside the capsule, under the eyes, toward where it floated in front of the chest.
        const origin: Vec3 = [eye[0], eye[1] - 0.22, eye[2]]
        const target: Vec3 = [eye[0] + direction[0] * 0.55, eye[1] + direction[1] * 0.55 - 0.14, eye[2] + direction[2] * 0.55]
        carried.release(origin, target, true, direction)
      }
      world.step()
    }
    return orbs.map(body => {
      const {x, y, z} = body.linvel()
      return inCrater(body.translation()) && Math.hypot(x, y, z) < 0.05
    })
  } finally {
    world.free()
  }
}
const [runX, screenZ] = bastionRun.path[1]
/** points on the run’s floor, from one side to the other, near the screen and further down */
const aims = [-1, -0.5, 0, 0.5, 1].flatMap(across => [1.5, 3, 6].map((ahead): Vec3 => [runX + across, bastionRun.floorY, screenZ + ahead]))
test('orbs thrown back down the western climb from the turn of the Cinnabar’s approach end up in the crater, aimed anywhere at the run’s floor', () => {
  expect(throwDownTheClimb(aims, true)).toEqual(aims.map(() => true))
})
test('thrown one after another, nine in ten of all the gallery’s orbs end up in it, piling up', () => {
  const state = mulberry32.create(5)
  const caught = Array.from({length: 4}, () => {
    const picked = aims.map(aim => [mulberry32.sample(state), aim] as const).toSorted(([a], [b]) => a - b).slice(0, vesperOrbPedestals.length).map(([, aim]) => aim)
    return throwDownTheClimb(picked).filter(Boolean).length
  })
  expect(caught.reduce((sum, value) => sum + value, 0)).toBeGreaterThanOrEqual(Math.ceil(vesperOrbPedestals.length * caught.length * 0.9))
})
// North, west and east, over the level landing
for (const heading of [0, Math.PI / 2, -Math.PI / 2]) {
  test(`a player who fell into the crater walks back out, heading ${heading.toFixed(2)}`, () => {
    const world = fortressWorld()
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(centerX, floorY + 0.04, centerZ))
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
    const motor = new EgoMotor(RAPIER, world, body, collider)
    const facing = new Quaternion
    facing.setFromAxisAngle(new Vector3(0, 1, 0), heading)
    try {
      for (let frame = 0; frame < 60; frame++) {
        motor.step(world.timestep, {}, facing)
        world.step()
      }
      expect(body.translation().y).toBeLessThan(floorY - 0.1)
      for (let frame = 0; frame < 60; frame++) {
        motor.step(world.timestep, {forward: true}, facing)
        world.step()
      }
      for (let frame = 0; frame < 30; frame++) {
        motor.step(world.timestep, {}, facing)
        world.step()
      }
      const {x, y, z} = body.translation()
      expect(Math.hypot(x - centerX, z - centerZ)).toBeGreaterThan(reach + 0.3)
      // West, the curve’s climb toward the Lodge begins.
      expect(y).toBeCloseTo(fortressCurve.floorAt(x, z)! + 0.02, 2)
      expect(motor.grounded).toBe(true)
    } finally {
      motor.dispose()
      world.free()
    }
  })
}
