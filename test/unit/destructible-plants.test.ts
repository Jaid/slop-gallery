import type {DestructiblePlantKind} from '../../src/lib/gallery/destructiblePlants/catalog.ts'

import {afterEach, beforeEach, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {destructiblePlants} from '../../src/lib/gallery/destructiblePlants/catalog.ts'
import {DestructiblePlantGeometry} from '../../src/lib/gallery/destructiblePlants/DestructiblePlantGeometry.ts'
import {plantCombinations, potDefinition} from '../../src/lib/gallery/plantDecorations/catalog.ts'
import {PlantGeometry} from '../../src/lib/gallery/plantDecorations/PlantGeometry.ts'
import {PotGeometry} from '../../src/lib/gallery/plantDecorations/PotGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import {GrabbableBody} from '../../src/lib/physics/GrabbableBody.ts'
import {initializeFoliageCollider} from '../../src/lib/physics/initializeFoliageCollider.ts'
import {leafPhysics} from '../../src/lib/physics/leaves.ts'
import {PlantAttachment} from '../../src/lib/physics/PlantAttachment.ts'

await RAPIER.init()
let world: RAPIER.World
let owned: Array<{dispose: () => void}>
beforeEach(() => {
  world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  owned = []
})
afterEach(() => {
  world.free()
  for (const geometry of owned) {
    geometry.dispose()
  }
})
function plant(kind: DestructiblePlantKind, id = kind as string, x = 0) {
  const specimen = destructiblePlants.find(candidate => candidate.id === kind)!
  const geometry = new DestructiblePlantGeometry(kind)
  const potGeometry = new PotGeometry(specimen.pot)
  owned.push(geometry, potGeometry)
  const definition = potDefinition(specimen.pot)
  const center = definition.height / 2
  const yaw = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), 0.47)
  const attachments = new PlantAttachment(geometry.leaves.map(leaf => `${id}-${leaf.id}`))
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, center, 0).setRotation(yaw).setCcdEnabled(true))
  world.createCollider(RAPIER.ColliderDesc.convexHull(potGeometry.vertices)!.setTranslation(0, -center, 0).setMass(3.8), body)
  world.createCollider(RAPIER.ColliderDesc.cylinder(0.015, definition.soilRadius).setTranslation(0, definition.soilHeight - 0.015 - center, 0).setMass(0.8), body)
  for (const collider of geometry.stemColliders) {
    world.createCollider(RAPIER.ColliderDesc.convexHull(collider.vertices)!.setTranslation(0, definition.soilHeight - center, 0).setEnabled(false).setMass(collider.mass), body)
  }
  const pot = new GrabbableBody(body, world, {
    canGrab: attachments.canGrabPot,
    onAttachmentChange: attachments.setPotAttached,
  })
  pot.rememberHome()
  const leaves = geometry.leaves.map(leaf => {
    const position = new Vector3(...leaf.position).add(new Vector3(0, definition.soilHeight, 0)).applyQuaternion(yaw).add(new Vector3(x, 0, 0))
    const rotation = yaw.clone().multiply((new Quaternion).setFromEuler(new Euler(...leaf.rotation)))
    const leafBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z).setRotation(rotation).setCcdEnabled(true).setGravityScale(leafPhysics.gravityScale).setLinearDamping(leafPhysics.linearDamping).setAngularDamping(leafPhysics.angularDamping))
    world.createCollider(RAPIER.ColliderDesc.convexHull(leaf.vertices)!.setEnabled(false).setMass(leaf.mass), leafBody)
    if (leaf.stemVertices) {
      world.createCollider(RAPIER.ColliderDesc.convexHull(leaf.stemVertices)!.setEnabled(false).setMass(leaf.stemMass), leafBody)
    }
    const controller = new GrabbableBody(leafBody, world, {
      onAttachmentChange: attached => attachments.setLeafAttached(`${id}-${leaf.id}`, attached),
      recoverAsDynamic: attachments.recoverLeafAsDynamic,
    })
    controller.rememberHome()
    return controller
  })
  world.step()
  return {
    attachments,
    geometry,
    leaves,
    pot,
  }
}
function pluckAll(leaves: Array<GrabbableBody>) {
  for (const [i, leaf] of leaves.entries()) {
    expect(leaf.grab()).toBe(true)
    leaf.body.setTranslation({
      x: 10 + i,
      y: 2,
      z: 0,
    }, true)
    leaf.release(false, [0, 0, 1])
  }
}
describe('new destructible botanical models', () => {
  test('collider initialization respects an existing body’s attachment state', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    const collider = world.createCollider(RAPIER.ColliderDesc.ball(0.1), body)
    initializeFoliageCollider(collider)
    expect(collider.isEnabled()).toBe(false)
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    initializeFoliageCollider(collider)
    expect(collider.isEnabled()).toBe(true)
    body.setBodyType(RAPIER.RigidBodyType.Fixed, true)
    initializeFoliageCollider(collider)
    expect(collider.isEnabled()).toBe(false)
    expect(() => initializeFoliageCollider(null)).not.toThrow()
  })
  test.each([['birdOfParadise', 9, 2500], ['peaceLily', 13, 3600]] as const)('%s has distinct, finite, low-poly detachable pieces', (kind, count, budget) => {
    const geometry = new DestructiblePlantGeometry(kind)
    const repeat = new DestructiblePlantGeometry(kind)
    owned.push(geometry, repeat)
    expect(geometry.leaves).toHaveLength(count)
    expect(new Set(geometry.leaves.map(leaf => leaf.id)).size).toBe(count)
    expect(new Set(geometry.leaves.map(leaf => Bun.hash(leaf.vertices))).size).toBeGreaterThan(3)
    expect(geometry.triangles).toBeLessThan(budget)
    expect(geometry.triangles).toBe(triangleCount(geometry.stems) + geometry.leaves.reduce((sum, leaf) => sum + triangleCount(leaf.geometry) + triangleCount(leaf.stem), 0))
    expect(geometry.leaves.some(leaf => !leaf.stem)).toBe(true)
    expect(geometry.leaves.some(leaf => leaf.stem)).toBe(true)
    for (const [i, leaf] of geometry.leaves.entries()) {
      expect(leaf.vertices).toEqual(repeat.leaves[i]!.vertices)
      expect(geometry.stemColliders[i]!.vertices).toEqual(repeat.stemColliders[i]!.vertices)
      expect(leaf.vertices).toEqual(Float32Array.from(leaf.geometry.getAttribute('position').array))
      expect(leaf.geometry.getAttribute('color').count).toBe(leaf.geometry.getAttribute('position').count)
      expect(leaf.mass).toBeGreaterThan(0)
      for (const part of [leaf.geometry, leaf.stem].filter(candidate => candidate !== null)) {
        expect(part.index).not.toBeNull()
        for (const attribute of Object.values(part.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
      }
      expect([...geometry.stemColliders[i]!.vertices].every(Number.isFinite)).toBe(true)
    }
    expect(geometry.leaves.filter(leaf => leaf.title.includes('flower'))).toHaveLength(kind === 'peaceLily' ? 3 : 0)
  })
  test('new signs preserve numbers 01–32 and both canopies clear the existing display', () => {
    expect(plantCombinations).toHaveLength(32)
    expect(destructiblePlants.map(specimen => specimen.number)).toEqual([33, 34])
    for (const specimen of destructiblePlants) {
      const geometry = new DestructiblePlantGeometry(specimen.id)
      owned.push(geometry)
      const bounds = geometry.stems.boundingBox!.clone()
      for (const leaf of geometry.leaves) {
        const transform = (new Matrix4).compose(new Vector3(...leaf.position), (new Quaternion).setFromEuler(new Euler(...leaf.rotation)), new Vector3(1, 1, 1))
        bounds.union(leaf.geometry.boundingBox!.clone().applyMatrix4(transform))
        if (leaf.stem) {
          bounds.union(leaf.stem.boundingBox!.clone().applyMatrix4(transform))
        }
      }
      bounds.translate(new Vector3(...specimen.position).add(new Vector3(0, potDefinition(specimen.pot).soilHeight, 0)))
      expect(bounds.min.x).toBeGreaterThan(-7)
      expect(bounds.max.x).toBeLessThan(7)
      expect(bounds.max.y).toBeLessThan(2.7)
      expect(bounds.max.z).toBeLessThan(6.2)
      for (const combination of plantCombinations) {
        const other = new PlantGeometry(combination.plant)
        try {
          const otherBounds = (new Box3).union(other.foliage.boundingBox!).union(other.stems.boundingBox!)
          otherBounds.translate(new Vector3(...combination.position).add(new Vector3(0, potDefinition(combination.pot).soilHeight + 0.036, 0)))
          expect(bounds.intersectsBox(otherBounds)).toBe(false)
        } finally {
          other.dispose()
        }
      }
    }
  })
  test.each(['birdOfParadise', 'peaceLily'] as const)('%s releases every owned buffer', kind => {
    const geometry = new DestructiblePlantGeometry(kind)
    const parts = [
      geometry.stems, ...geometry.leaves.flatMap(leaf => {
        return leaf.stem ? [leaf.geometry, leaf.stem] : [leaf.geometry]
      }),
    ]
    let disposed = 0
    for (const part of parts) {
      part.addEventListener('dispose', () => disposed++)
    }
    geometry.dispose()
    expect(disposed).toBe(parts.length)
  })
})
for (const kind of ['birdOfParadise', 'peaceLily'] as const) {
  describe(`${kind} destruction`, () => {
    test('settled attached foliage clears its pot before the first pluck', () => {
      const {leaves} = plant(kind)
      for (let i = 0; i < 120; i++) {
        world.step()
      }
      for (const leaf of leaves) {
        const p = leaf.body.translation()
        expect(leaf.placement.hasRoom([p.x, p.y, p.z], false)).toBe(true)
        expect(leaf.body.isFixed()).toBe(true)
        for (let i = 0; i < leaf.body.numColliders(); i++) {
          expect(leaf.body.collider(i).isEnabled()).toBe(false)
        }
      }
    })
    test('plucking, canceling and re-grabbing use the legacy attachment rules', () => {
      const {attachments, leaves, pot} = plant(kind)
      expect(pot.grab()).toBe(false)
      const leaf = leaves[1]!
      const original = leaf.body.translation()
      const rotation = leaf.body.rotation()
      expect(leaf.grab()).toBe(true)
      leaf.move([0, 1.5, 3], [0, 1.5, 2], 1 / 60, false)
      expect(leaf.body.translation()).not.toEqual(original)
      expect(attachments.remaining).toBe(leaves.length - 1)
      leaf.cancel()
      expect(leaf.body.translation()).toEqual(original)
      for (const axis of ['x', 'y', 'z', 'w'] as const) {
        expect(leaf.body.rotation()[axis]).toBeCloseTo(rotation[axis], 6)
      }
      expect(attachments.remaining).toBe(leaves.length)
      pluckAll(leaves)
      expect(attachments.canGrabPot()).toBe(true)
      leaf.grab()
      leaf.cancel()
      expect(attachments.remaining).toBe(0)
      expect(leaf.body.isDynamic()).toBe(true)
      expect(pot.grab()).toBe(true)
    })
    test('the last canceled pluck relocks only its own pot', () => {
      const first = plant(kind, 'first')
      const second = plant(kind, 'second', 4)
      for (const leaf of first.leaves) {
        leaf.grab()
      }
      expect(first.attachments.canGrabPot()).toBe(true)
      expect(second.pot.grab()).toBe(false)
      first.leaves.at(-1)!.cancel()
      first.leaves.at(-1)!.cancel()
      first.attachments.setLeafAttached('second-leaf-0', false)
      expect(first.attachments.remaining).toBe(1)
      expect(first.pot.grab()).toBe(false)
    })
    test('leaves and carried stalks become a single throwable compound body and land on the floor', () => {
      const {geometry, leaves} = plant(kind)
      world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0))
      const leaf = leaves[1]!
      expect(leaf.body.numColliders()).toBe(2)
      leaf.grab()
      leaf.body.setTranslation({
        x: 0,
        y: 2,
        z: 3,
      }, true)
      leaf.release(true, [0, 0, 1])
      expect(leaf.body.isDynamic()).toBe(true)
      expect(leaf.body.linvel().z).toBe(10)
      for (let i = 0; i < leaf.body.numColliders(); i++) {
        expect(leaf.body.collider(i).isEnabled()).toBe(true)
      }
      world.step()
      expect(leaf.body.mass()).toBeCloseTo(geometry.leaves[1]!.mass + geometry.leaves[1]!.stemMass, 5)
      for (let i = 0; i < 360; i++) {
        world.step()
      }
      expect(leaf.body.translation().z).toBeGreaterThan(3)
      expect(leaf.body.translation().y).toBeGreaterThan(-0.1)
      expect(leaf.body.translation().y).toBeLessThan(0.8)
    })
    test('empty pots carry their remaining stems without dragging loose leaves', () => {
      const {geometry, leaves, pot} = plant(kind)
      pluckAll(leaves)
      const positions = leaves.map(leaf => leaf.body.translation())
      pot.grab()
      pot.body.setTranslation({
        x: 0,
        y: 2,
        z: 3,
      }, true)
      pot.release(true, [0, 0, 1])
      expect(pot.body.isDynamic()).toBe(true)
      expect(pot.body.numColliders()).toBe(geometry.leaves.length + 2)
      expect(leaves.map(leaf => leaf.body.translation())).toEqual(positions)
      world.step()
      expect(pot.body.mass()).toBeCloseTo(4.6 + geometry.stemColliders.reduce((sum, collider) => sum + collider.mass, 0), 4)
      for (let i = 0; i < pot.body.numColliders(); i++) {
        expect(pot.body.collider(i).isEnabled()).toBe(true)
      }
    })
    test('lost leaves reattach only while their pot remains anchored', () => {
      const {attachments, leaves, pot} = plant(kind)
      pluckAll(leaves)
      const leaf = leaves[0]!
      const handle = leaf.body.handle
      leaf.body.setTranslation({
        x: 0,
        y: -5,
        z: 0,
      }, true)
      leaf.recover()
      expect(leaf.body.isFixed()).toBe(true)
      expect(attachments.remaining).toBe(1)
      expect(pot.grab()).toBe(false)
      leaf.grab()
      leaf.body.setTranslation({
        x: 10,
        y: 2,
        z: 0,
      }, true)
      leaf.release(false, [0, 0, 1])
      pot.grab()
      pot.body.setTranslation({
        x: 0,
        y: 2,
        z: 4,
      }, true)
      pot.release(false, [0, 0, 1])
      leaf.body.setTranslation({
        x: 0,
        y: -5,
        z: 0,
      }, true)
      leaf.recover()
      expect(leaf.body.isDynamic()).toBe(true)
      expect(leaf.body.collider(0).isEnabled()).toBe(true)
      expect(attachments.remaining).toBe(0)
      expect(leaf.body.handle).toBe(handle)
    })
  })
}
