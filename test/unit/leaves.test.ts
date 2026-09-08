import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import RAPIER from '@dimforge/rapier3d-compat'
import {Euler, Plane, Quaternion, Vector3} from 'three/webgpu'

import {GrabbableBody} from '../../src/lib/physics/GrabbableBody.ts'
import type {LeafStem} from '../../src/lib/physics/leaves.ts'
import {leafGeometry, leafPhysics, leafRotation, leafVertices, plantLeaves} from '../../src/lib/physics/leaves.ts'

await RAPIER.init()
let world: RAPIER.World
beforeEach(() => {world = new RAPIER.World({x: 0, y: -9.81, z: 0})})
afterEach(() => world.free())

function leaf(position: [number, number, number] = [0, 1.5, 0], rotation = new Quaternion(), stem?: LeafStem) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position).setRotation(rotation).setGravityScale(leafPhysics.gravityScale).setLinearDamping(leafPhysics.linearDamping).setAngularDamping(leafPhysics.angularDamping).setCcdEnabled(true))
  world.createCollider(RAPIER.ColliderDesc.convexHull(leafVertices)!.setEnabled(false).setMass(leafPhysics.mass).setRestitution(leafPhysics.restitution).setFriction(leafPhysics.friction), body)
  if (stem?.vertices) world.createCollider(RAPIER.ColliderDesc.convexHull(stem.vertices)!.setEnabled(false).setMass(stem.mass).setRestitution(leafPhysics.restitution).setFriction(leafPhysics.friction), body)
  const carried = new GrabbableBody(body, world)
  carried.rememberHome()
  return carried
}
const step = (count = 60) => {for (let i = 0; i < count; i++) world.step()}
const position = (carried: GrabbableBody) => {const p = carried.body.translation(); return [p.x, p.y, p.z]}

describe('pluckable foliage', () => {
  test('all 44 leaves have distinct, stable identities and the original appearance', () => {
    const plants: Array<[number, number, number]> = [[-6.6, 0, -6.5], [6.6, 0, -6.5], [-18.8, 0, 6.5], [18.8, 0, 6.5]]
    const leaves = plants.flatMap(plantLeaves)
    expect(leaves).toHaveLength(44)
    expect(new Set(leaves.map(leaf => leaf.id)).size).toBe(44)
    expect(plants.flatMap(plantLeaves)).toEqual(leaves)
    leafGeometry.computeBoundingBox()
    expect(leafGeometry.boundingBox!.max.y).toBeCloseTo(0.48)
    expect(leafGeometry.boundingBox!.max.z).toBeCloseTo(0.045)
  })
  test('each plant mixes bare heads, short stalks and long stems without regenerating geometry', () => {
    const a = plantLeaves([0, 0, 0]), b = plantLeaves([5, 0, 2])
    const lengths = a.map(leaf => leaf.stem.carriedLength)
    expect(lengths.filter(length => length === 0).length).toBeGreaterThan(0)
    expect(lengths.some(length => length > 0 && length < 0.3)).toBe(true)
    expect(lengths.some(length => length > 0.75)).toBe(true)
    expect(new Set(lengths).size).toBeGreaterThan(5)
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.stem).toBe(b[i]!.stem)
      expect(Boolean(a[i]!.stem.carriedGeometry)).toBe(lengths[i]! > 0)
      expect(a[i]!.stem.vertices?.length ?? 0).toBe(a[i]!.stem.carriedGeometry?.getAttribute('position').array.length ?? 0)
    }
  })
  test('the two tapered stem sections meet exactly and keep their original roots', () => {
    const axis = new Vector3(Math.sin(0.32), Math.cos(0.32), 0)
    for (const definition of plantLeaves([0, 0, 0])) {
      const {stem} = definition
      const center = new Vector3(0.15, definition.stemHeight, 0)
      const positions = stem.remainingGeometry.getAttribute('position')
      const remaining = Array.from({length: positions.count}, (_, i) => new Vector3().fromBufferAttribute(positions, i))
      const carried = stem.carriedGeometry?.getAttribute('position')
      const upper = carried ? Array.from({length: carried.count}, (_, i) => new Vector3().fromBufferAttribute(carried, i).applyEuler(new Euler(...leafRotation)).add(new Vector3(...definition.position))) : []
      const height = (point: Vector3) => point.clone().sub(center).dot(axis)
      const tip = (definition.position[1] - definition.stemHeight) / axis.y
      const length = tip + 0.55
      const cut = tip - stem.carriedLength
      expect(Math.min(...remaining.map(height))).toBeCloseTo(-0.55, 6)
      expect(Math.max(...remaining.map(height))).toBeCloseTo(cut, 6)
      for (const point of [...remaining, ...upper]) {
        const h = height(point)
        const radial = point.clone().sub(center).addScaledVector(axis, -h).length()
        // Cap centers are inside the taper; ring vertices sit on it.
        expect(radial).toBeLessThanOrEqual(0.018 - (h + 0.55) / length * 0.006 + 0.000001)
      }
      if (!upper.length) continue
      expect(Math.min(...upper.map(height))).toBeCloseTo(cut, 6)
      expect(Math.max(...upper.map(height))).toBeCloseTo(tip, 6)
      const lowerSeam = remaining.filter(point => Math.abs(height(point) - cut) < 0.000001)
      const upperSeam = upper.filter(point => Math.abs(height(point) - cut) < 0.000001)
      for (const point of lowerSeam) expect(Math.min(...upperSeam.map(other => other.distanceTo(point)))).toBeLessThan(0.000001)
      for (const point of upperSeam) expect(Math.min(...lowerSeam.map(other => other.distanceTo(point)))).toBeLessThan(0.000001)
    }
  })
  test('every stem tip is fully buried inside the leaf, including its entire cap', () => {
    const vertices = leafGeometry.getAttribute('position')
    const indices = leafGeometry.index!
    const planes: Plane[] = []
    for (let i = 0; i < indices.count; i += 3) {
      planes.push(new Plane().setFromCoplanarPoints(
        new Vector3().fromBufferAttribute(vertices, indices.getX(i)),
        new Vector3().fromBufferAttribute(vertices, indices.getX(i + 1)),
        new Vector3().fromBufferAttribute(vertices, indices.getX(i + 2)),
      ))
    }
    const rotation = new Quaternion().setFromEuler(new Euler(...leafRotation))
    const inverse = rotation.clone().invert()
    const axis = new Vector3(Math.sin(0.32), Math.cos(0.32), 0)
    for (const definition of plantLeaves([0, 0, 0])) {
      const geometry = definition.stem.carriedGeometry ?? definition.stem.remainingGeometry
      const points = geometry.getAttribute('position')
      const leafCenter = new Vector3(...definition.position)
      const local = Array.from({length: points.count}, (_, i) => {
        const point = new Vector3().fromBufferAttribute(points, i)
        return definition.stem.carriedGeometry ? point : point.sub(leafCenter).applyQuaternion(inverse)
      })
      const heights = local.map(point => point.clone().applyQuaternion(rotation).add(leafCenter).dot(axis))
      const tip = Math.max(...heights)
      const cap = local.filter((_, i) => tip - heights[i]! < 0.000001)
      expect(cap.length).toBeGreaterThanOrEqual(5)
      // Check the actual faceted mesh, not its looser bounding box or ideal ellipsoid.
      const clearance = Math.max(...cap.flatMap(point => planes.map(plane => plane.distanceToPoint(point))))
      expect(clearance).toBeLessThan(-0.005)
    }
  })
  test('long stems move, cancel, throw and recover as part of the same compound leaf', () => {
    const definition = plantLeaves([0, 0, 0])[4]!
    const rotation = new Quaternion().setFromEuler(new Euler(...leafRotation))
    const carried = leaf(definition.position, rotation, definition.stem)
    const original = position(carried)
    expect(carried.body.numColliders()).toBe(2)
    carried.grab()
    for (let i = 0; i < 30; i++) carried.move([0, 1.4, 2], [0, 1.4, 1.3], 1 / 60)
    expect(position(carried)).not.toEqual(original)
    carried.cancel()
    expect(position(carried)).toEqual(original)
    for (let i = 0; i < 2; i++) expect(carried.body.collider(i).isEnabled()).toBe(false)
    carried.grab()
    carried.release(true, [0, 0, 1])
    for (let i = 0; i < 2; i++) expect(carried.body.collider(i).isEnabled()).toBe(true)
    expect(carried.body.mass()).toBeCloseTo(leafPhysics.mass + definition.stem.mass)
    step(20)
    expect(carried.body.translation().z).toBeGreaterThan(2)
    carried.body.setTranslation({x: 5, y: -5, z: 0}, true)
    carried.recover()
    expect(position(carried)).toEqual(original)
    expect(carried.body.isFixed()).toBe(true)
    for (let i = 0; i < 2; i++) expect(carried.body.collider(i).isEnabled()).toBe(false)
  })
  test('held clearance includes the long stem, not just the leaf head', () => {
    const definition = plantLeaves([0, 0, 0])[4]!
    const rotation = new Quaternion().setFromEuler(new Euler(...leafRotation))
    const carried = leaf(definition.position, rotation, definition.stem)
    const headOnly = leaf(definition.position, rotation)
    const axis = new Vector3(Math.sin(0.32), Math.cos(0.32), 0)
    const stemPoint = new Vector3(0.15, definition.stemHeight, 0).addScaledVector(axis, -0.3)
    world.createCollider(RAPIER.ColliderDesc.ball(0.03).setTranslation(...stemPoint.toArray()))
    step(1)
    expect(headOnly.placement.hasRoom(definition.position)).toBe(true)
    expect(carried.placement.hasRoom(definition.position)).toBe(false)
  })
  test('attached leaves stay in place and do not block or repel one another', () => {
    const a = leaf(), b = leaf()
    step(120)
    expect(position(a)).toEqual([0, 1.5, 0])
    expect(position(b)).toEqual([0, 1.5, 0])
    expect(a.body.isFixed()).toBe(true)
    expect(a.body.collider(0).isEnabled()).toBe(false)
    expect(a.placement.hasRoom([0, 1.5, 0], false)).toBe(true)
  })
  test('plucks exactly one leaf without disturbing its neighbor', () => {
    const a = leaf(), b = leaf([0.2, 1.5, 0])
    a.grab()
    for (let i = 0; i < 30; i++) a.move([0, 1.4, 2], [0, 1.4, 1.3], 1 / 60)
    expect(a.active).toBe(true)
    expect(a.body.isFixed()).toBe(true)
    expect(a.body.isSleeping()).toBe(false)
    expect(a.body.collider(0).isEnabled()).toBe(false)
    expect(a.body.translation().z).toBeGreaterThan(1.29)
    expect(position(b)).toEqual([Math.fround(0.2), 1.5, 0])
    expect(b.body.isFixed()).toBe(true)
    expect(b.body.collider(0).isEnabled()).toBe(false)
  })
  test('cancel restores an attachment’s world transform on a rotated stem', () => {
    const plant = new Vector3(-6.6, 0, -6.5)
    const definition = plantLeaves(plant.toArray())[7]!
    const stem = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), definition.angle)
    const anchor = new Vector3(...definition.position).applyQuaternion(stem).add(plant)
    const rotation = stem.clone().multiply(new Quaternion().setFromEuler(new Euler(0.3, 0, -0.55)))
    const carried = leaf(anchor.toArray(), rotation)
    const original = position(carried), originalRotation = carried.body.rotation()
    carried.grab()
    for (let i = 0; i < 30; i++) carried.move([-5, 1.4, -5], [-5, 1.4, -4], 1 / 60)
    expect(position(carried)).not.toEqual(original)
    carried.cancel()
    carried.cancel()
    expect(position(carried)).toEqual(original)
    expect(carried.body.rotation()).toEqual(originalRotation)
    expect(carried.body.isFixed()).toBe(true)
    expect(carried.body.collider(0).isEnabled()).toBe(false)
    expect(carried.active).toBe(false)
  })
  test('throwing detaches, enables collision and gives the leaf linear and angular motion', () => {
    const carried = leaf()
    carried.grab()
    carried.release(true, [0, 0, -1])
    expect(carried.active).toBe(false)
    expect(carried.body.isDynamic()).toBe(true)
    expect(carried.body.collider(0).isEnabled()).toBe(true)
    expect(carried.body.mass()).toBeCloseTo(leafPhysics.mass)
    expect(carried.body.linvel().z).toBe(-10)
    expect(carried.body.angvel().x).toBe(3)
    step(20)
    expect(carried.body.translation().z).toBeLessThan(-2)
    expect(Math.abs(carried.body.rotation().x)).toBeGreaterThan(0.05)
  })
  test('dropping falls onto the floor rather than through it', () => {
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0))
    const carried = leaf()
    carried.grab()
    carried.release(false, [0, 0, -1])
    expect(carried.body.linvel()).toEqual({x: 0, y: 0, z: 0})
    step(240)
    expect(carried.body.translation().y).toBeGreaterThan(0)
    expect(carried.body.translation().y).toBeLessThan(0.6)
  })
  test('a dropped leaf can be re-grabbed and canceled without reattaching to its stem', () => {
    const carried = leaf()
    carried.grab()
    carried.release(true, [1, 0, 0])
    step(20)
    const dropped = position(carried)
    carried.body.sleep()
    carried.grab()
    expect(carried.body.isSleeping()).toBe(false)
    carried.move([0, 1.4, 0], [0, 1.4, 1], 1 / 60)
    carried.cancel()
    expect(position(carried)).toEqual(dropped)
    expect(carried.body.isDynamic()).toBe(true)
    expect(carried.body.collider(0).isEnabled()).toBe(true)
  })
  test('lost leaves recover to their original stem without creating duplicate bodies', () => {
    const carried = leaf()
    const handle = carried.body.handle
    carried.grab()
    carried.release(true, [1, 0, 0])
    carried.body.setTranslation({x: 12, y: -5, z: 4}, true)
    carried.recover()
    expect(position(carried)).toEqual([0, 1.5, 0])
    expect(carried.body.isFixed()).toBe(true)
    expect(carried.body.collider(0).isEnabled()).toBe(false)
    expect(carried.body.handle).toBe(handle)
    carried.grab()
    carried.release(true, [0, 0, 1])
    expect(carried.body.linvel().z).toBe(10)
  })
})

describe('shared grabbing regressions', () => {
  test('sleeping sculptures wake and cancel restores their dynamic compound colliders', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1, 2, 3))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.05, 0.4), body)
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.35, 0.01, 0.45).setTranslation(0, 0.06, 0), body)
    body.sleep()
    const carried = new GrabbableBody(body, world)
    expect(carried.grab()).toBe(true)
    expect(carried.grab()).toBe(false)
    expect(body.isSleeping()).toBe(false)
    expect(body.isFixed()).toBe(true)
    for (let i = 0; i < body.numColliders(); i++) expect(body.collider(i).isEnabled()).toBe(false)
    carried.move([0, 1.4, 0], [0, 1.4, 1], 1 / 60)
    carried.cancel()
    expect(position(carried)).toEqual([1, 2, 3])
    expect(body.isDynamic()).toBe(true)
    for (let i = 0; i < body.numColliders(); i++) expect(body.collider(i).isEnabled()).toBe(true)
  })
  test('cancel after a completed throw does not stop or teleport the prop', () => {
    const carried = leaf()
    carried.grab()
    carried.release(true, [0, 0, 1])
    step(5)
    const before = position(carried), velocity = carried.body.linvel()
    carried.cancel()
    expect(position(carried)).toEqual(before)
    expect(carried.body.linvel()).toEqual(velocity)
  })
})
