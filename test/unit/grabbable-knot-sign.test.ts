import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {BoxGeometry, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {knotSign, knotSignId, knotSignParts, knotSignRoundParts} from '../../src/lib/knots/signs.ts'
import GrabbableBody from '../../src/lib/physics/GrabbableBody.ts'
import InstancedPropVisuals from '../../src/lib/physics/InstancedPropVisuals.ts'

await RAPIER.init()
test('a complete nameplate can be picked up, canceled, thrown and picked up again', () => {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.1, 30).setTranslation(0, -0.1, 0))
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, knotSign.elevation, 0).setCcdEnabled(true).setLinearDamping(0.1).setAngularDamping(0.15))
  for (const {size, position, rotation = [0, 0, 0]} of knotSignParts) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position).setRotation((new Quaternion).setFromEuler(new Euler(...rotation))).setMass(knotSign.plateMass).setFriction(0.9).setRestitution(0.1), body)
  }
  for (const {radius, height, position, mass} of knotSignRoundParts) {
    world.createCollider(RAPIER.ColliderDesc.cylinder(height / 2, radius).setTranslation(...position).setMass(mass).setFriction(0.9).setRestitution(0.1), body)
  }
  const carried = new GrabbableBody(body, world)
  try {
    for (let i = 0; i < 300; i++) {
      world.step()
    }
    expect(body.translation().y).toBeCloseTo(knotSign.elevation, 2)
    expect(body.mass()).toBeCloseTo(3.5)
    const resting = body.translation()
    const rotation = body.rotation()
    body.sleep()
    expect(carried.grab()).toBe(true)
    expect(body.isSleeping()).toBe(false)
    expect(body.isFixed()).toBe(true)
    for (let i = 0; i < body.numColliders(); i++) {
      expect(body.collider(i).isEnabled()).toBe(false)
    }
    for (let i = 0; i < 90; i++) {
      carried.move([0, 1.5, 1], [0, 1.5, 2], 1 / 60)
      world.step()
    }
    expect(body.translation().y).toBeGreaterThan(1.4)
    expect(body.translation().z).toBeGreaterThan(1.9)
    carried.cancel()
    expect(body.translation()).toEqual(resting)
    expect(body.rotation()).toEqual(rotation)
    expect(body.isDynamic()).toBe(true)
    expect(carried.grab()).toBe(true)
    for (let i = 0; i < 90; i++) {
      carried.move([0, 1.5, 1], [0, 1.5, 2], 1 / 60)
      world.step()
    }
    expect(carried.release(true, [0, 0, 1])).toBe(false)
    expect(body.linvel().z).toBe(10)
    expect(body.angvel().x).toBe(3)
    for (let i = 0; i < body.numColliders(); i++) {
      expect(body.collider(i).isEnabled()).toBe(true)
    }
    for (let i = 0; i < 600; i++) {
      world.step()
    }
    expect(body.translation().z).toBeGreaterThan(3)
    expect(body.translation().y).toBeGreaterThan(-0.05)
    const landed = body.translation()
    expect(carried.grab()).toBe(true)
    for (let i = 0; i < 90; i++) {
      carried.move([landed.x, 1.5, landed.z], [landed.x, 1.5, landed.z + 1], 1 / 60)
      world.step()
    }
    expect(body.translation().y).toBeGreaterThan(1.4)
    carried.cancel()
    expect(body.translation()).toEqual(landed)
    expect(body.isDynamic()).toBe(true)
  } finally {
    world.free()
  }
})
test('instanced faces and supports follow prop transforms, even outside their original bounds', () => {
  const geometry = new BoxGeometry(1, 0.6, 0.03)
  const material = new MeshBasicMaterial
  const faces = new InstancedMesh(geometry, material, 2)
  const supports = new InstancedMesh(geometry, material, 2)
  const root = new Group
  root.position.set(5, 2, -3)
  root.rotation.y = 0.7
  root.add(faces, supports)
  const first = new Group
  const second = new Group
  const targets = new Map([[knotSignId('first'), first], [knotSignId('second'), second]])
  const visuals = new InstancedPropVisuals([faces, supports], [...targets.keys()])
  try {
    for (const x of [0, 50, -100]) {
      first.position.set(x, 1.5, 8)
      first.rotation.set(0.8, 0.2, -0.3)
      second.position.set(3, 0.4, 4)
      visuals.update(id => targets.get(id))
      for (const mesh of [faces, supports]) {
        const matrix = new Matrix4
        mesh.getMatrixAt(0, matrix)
        const worldMatrix = (new Matrix4).multiplyMatrices(mesh.matrixWorld, matrix)
        for (let i = 0; i < 16; i++) {
          expect(worldMatrix.elements[i]).toBeCloseTo(first.matrixWorld.elements[i], 4)
        }
        expect(mesh.boundingBox!.containsPoint((new Vector3).setFromMatrixPosition(matrix))).toBe(true)
      }
    }
    const version = faces.instanceMatrix.version
    visuals.update(id => targets.get(id))
    expect(faces.instanceMatrix.version).toBe(version)
    const proxy = new Mesh(geometry, material)
    proxy.visible = false
    first.add(proxy)
    first.position.set(0, 0, -2)
    first.rotation.set(0, 0, 0)
    first.updateMatrixWorld(true)
    expect(new Raycaster(new Vector3, new Vector3(0, 0, -1)).intersectObject(first, true)).not.toHaveLength(0)
  } finally {
    faces.dispose()
    supports.dispose()
    geometry.dispose()
    material.dispose()
  }
})
