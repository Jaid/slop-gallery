import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import RAPIER from '@dimforge/rapier3d-compat'
import {Euler, Quaternion, Vector3} from 'three/webgpu'

import {GrabbableBody} from '../../src/lib/physics/GrabbableBody.ts'
import {leafPhysics, leafRotation, leafVertices, plantLeaves} from '../../src/lib/physics/leaves.ts'
import {PlantAttachment} from '../../src/lib/physics/PlantAttachment.ts'
import {potGeometry, potPhysics, potVertices} from '../../src/lib/physics/pots.ts'

await RAPIER.init()
let world: RAPIER.World
beforeEach(() => {world = new RAPIER.World({x: 0, y: -9.81, z: 0})})
afterEach(() => world.free())
const step = (count = 60) => {for (let i = 0; i < count; i++) world.step()}
const position = (prop: GrabbableBody) => {const p = prop.body.translation(); return [p.x, p.y, p.z]}

function plant() {
  const definitions = plantLeaves([0, 0, 0])
  const attachments = new PlantAttachment(definitions.map(leaf => leaf.id))
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.36, 0).setCcdEnabled(true))
  world.createCollider(RAPIER.ColliderDesc.convexHull(potVertices)!.setTranslation(0, -0.36, 0).setMass(3.8).setRestitution(potPhysics.restitution).setFriction(potPhysics.friction), body)
  world.createCollider(RAPIER.ColliderDesc.cylinder(0.015, 0.33).setTranslation(0, 0.36, 0).setMass(0.8), body)
  for (const definition of definitions) {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), definition.angle)
    world.createCollider(RAPIER.ColliderDesc.convexHull(definition.stem.remainingVertices)!.setTranslation(0, -0.36, 0).setRotation(rotation).setMass(0.003).setEnabled(false), body)
  }
  const pot = new GrabbableBody(body, world, {
    canGrab: attachments.canGrabPot,
    onAttachmentChange: attachments.setPotAttached,
  })
  pot.rememberHome()
  const leaves = definitions.map(definition => {
    const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), definition.angle)
    const anchor = new Vector3(...definition.position).applyQuaternion(yaw)
    const rotation = yaw.multiply(new Quaternion().setFromEuler(new Euler(...leafRotation)))
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...anchor.toArray()).setRotation(rotation))
    world.createCollider(RAPIER.ColliderDesc.convexHull(leafVertices)!.setEnabled(false).setMass(leafPhysics.mass), body)
    if (definition.stem.vertices) world.createCollider(RAPIER.ColliderDesc.convexHull(definition.stem.vertices)!.setEnabled(false).setMass(definition.stem.mass), body)
    const carried = new GrabbableBody(body, world, {
      onAttachmentChange: attached => attachments.setLeafAttached(definition.id, attached),
      recoverAsDynamic: attachments.recoverLeafAsDynamic,
    })
    carried.rememberHome()
    return carried
  })
  return {attachments, pot, leaves}
}

function pluckAll(leaves: GrabbableBody[]) {
  leaves.forEach((leaf, i) => {
    leaf.grab()
    leaf.body.setTranslation({x: 10 + i * 2, y: 2, z: 0}, true)
    leaf.release(false, [0, 0, 1])
  })
}

describe('throwable plant pots', () => {
  test('rendered pot and collider share the same tapered geometry', () => {
    expect(potVertices).toEqual(Float32Array.from(potGeometry.getAttribute('position').array))
    potGeometry.computeBoundingBox()
    expect(potGeometry.boundingBox!.min.y).toBeCloseTo(0)
    expect(potGeometry.boundingBox!.max.y).toBeCloseTo(0.72)
    expect(potGeometry.boundingBox!.max.x).toBeCloseTo(0.38)
  })
  test('the pot stays fixed and solid until its own last leaf is absent', () => {
    const {attachments, pot, leaves} = plant()
    const original = position(pot)
    expect(attachments.remaining).toBe(11)
    expect(pot.grab()).toBe(false)
    expect(pot.active).toBe(false)
    expect(pot.body.isFixed()).toBe(true)
    expect(pot.body.collider(0).isEnabled()).toBe(true)
    leaves.slice(0, 10).forEach(leaf => leaf.grab())
    expect(attachments.remaining).toBe(1)
    expect(pot.grab()).toBe(false)
    expect(position(pot)).toEqual(original)
    leaves[10]!.grab()
    expect(attachments.remaining).toBe(0)
    expect(pot.grab()).toBe(true)
    expect(attachments.potAttached).toBe(false)
  })
  test('canceling the last pluck relocks the pot; repeated events and foreign leaves do not unlock it', () => {
    const {attachments, pot, leaves} = plant()
    leaves.forEach(leaf => leaf.grab())
    leaves[10]!.cancel()
    leaves[10]!.cancel()
    attachments.setLeafAttached('a leaf from another plant', false)
    expect(attachments.remaining).toBe(1)
    expect(pot.grab()).toBe(false)
    leaves[0]!.grab()
    expect(attachments.remaining).toBe(1)
    leaves[10]!.grab()
    expect(pot.grab()).toBe(true)
  })
  test('canceling a re-grab of a loose leaf does not relock the pot', () => {
    const {attachments, leaves} = plant()
    pluckAll(leaves)
    leaves[0]!.grab()
    leaves[0]!.cancel()
    expect(attachments.remaining).toBe(0)
    expect(attachments.canGrabPot()).toBe(true)
  })
  test('pot cancellation restores its original pose and collider flags without moving loose leaves', () => {
    const {attachments, pot, leaves} = plant()
    pluckAll(leaves)
    const original = position(pot), loose = leaves.map(position)
    pot.grab()
    for (let i = 0; i < 30; i++) pot.move([0, 1.4, 2], [0, 1.4, 1.3], 1 / 60)
    expect(position(pot)).not.toEqual(original)
    expect(leaves.map(position)).toEqual(loose)
    pot.cancel()
    expect(position(pot)).toEqual(original)
    expect(attachments.potAttached).toBe(true)
    expect(pot.body.isFixed()).toBe(true)
    expect(pot.body.collider(0).isEnabled()).toBe(true)
    expect(pot.body.collider(1).isEnabled()).toBe(true)
    for (let i = 2; i < pot.body.numColliders(); i++) expect(pot.body.collider(i).isEnabled()).toBe(false)
  })
  test('throwing carries the pot, soil and all remaining stems as one dynamic compound body', () => {
    const {pot, leaves} = plant()
    pluckAll(leaves)
    pot.grab()
    pot.body.setTranslation({x: 0, y: 1.4, z: 2}, true)
    pot.release(true, [0, 0, 1])
    expect(pot.body.numColliders()).toBe(13)
    expect(pot.body.isDynamic()).toBe(true)
    expect(pot.body.mass()).toBeCloseTo(potPhysics.mass + 11 * 0.003)
    for (let i = 0; i < pot.body.numColliders(); i++) expect(pot.body.collider(i).isEnabled()).toBe(true)
    expect(pot.body.linvel().z).toBe(10)
    step(20)
    expect(pot.body.translation().z).toBeGreaterThan(4)
    expect(Math.abs(pot.body.rotation().x)).toBeGreaterThan(0.05)
    const dropped = position(pot)
    pot.body.sleep()
    expect(pot.grab()).toBe(true)
    expect(pot.body.isSleeping()).toBe(false)
    pot.cancel()
    expect(position(pot)).toEqual(dropped)
    expect(pot.body.isDynamic()).toBe(true)
  })
  test('a released pot lands on the floor rather than falling through it', () => {
    const {pot, leaves} = plant()
    pluckAll(leaves)
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0))
    pot.grab()
    pot.body.setTranslation({x: 0, y: 2, z: 2}, true)
    pot.release(false, [0, 0, 1])
    step(300)
    expect(pot.body.translation().y).toBeGreaterThan(0.2)
    expect(pot.body.translation().y).toBeLessThan(0.5)
  })
  test('remaining stems participate in held clearance even while their colliders are disabled', () => {
    const {pot, leaves} = plant()
    pluckAll(leaves)
    const stemPoint = new Vector3(0.15, 1.13, 0).addScaledVector(new Vector3(Math.sin(0.32), Math.cos(0.32), 0), -0.15)
    world.createCollider(RAPIER.ColliderDesc.ball(0.025).setTranslation(...stemPoint.toArray()))
    step(1)
    expect(pot.placement.hasRoom([0, 0.36, 0])).toBe(false)
  })
  test('a lost leaf reattaches only while its pot is still anchored', () => {
    const {attachments, pot, leaves} = plant()
    pluckAll(leaves)
    leaves[0]!.body.setTranslation({x: 0, y: -5, z: 0}, true)
    leaves[0]!.recover()
    expect(leaves[0]!.body.isFixed()).toBe(true)
    expect(attachments.remaining).toBe(1)
    expect(pot.grab()).toBe(false)
    leaves[0]!.grab()
    leaves[0]!.body.setTranslation({x: 10, y: 2, z: 0}, true)
    leaves[0]!.release(false, [0, 0, 1])
    pot.grab()
    pot.body.setTranslation({x: 0, y: 2, z: 5}, true)
    pot.release(false, [0, 0, 1])
    leaves[0]!.body.setTranslation({x: 0, y: -5, z: 0}, true)
    leaves[0]!.recover()
    expect(leaves[0]!.body.isDynamic()).toBe(true)
    expect(leaves[0]!.body.collider(0).isEnabled()).toBe(true)
    expect(attachments.remaining).toBe(0)
    expect(pot.grab()).toBe(true)
  })
  test('lost pots recover as anchored empty pots without replanting the leaves', () => {
    const {attachments, pot, leaves} = plant()
    const original = position(pot)
    pluckAll(leaves)
    pot.grab()
    pot.release(true, [0, 0, 1])
    pot.body.setTranslation({x: 0, y: -5, z: 5}, true)
    pot.recover()
    expect(position(pot)).toEqual(original)
    expect(attachments.potAttached).toBe(true)
    expect(attachments.remaining).toBe(0)
    expect(pot.grab()).toBe(true)
  })
})
