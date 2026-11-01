import type {Vec3} from '../types.ts'
import type {RapierRigidBody} from '@react-three/rapier'
import type {Object3D} from 'three/webgpu'

import {Matrix4, Quaternion, Vector3} from 'three/webgpu'

const position = new Vector3
const quaternion = new Quaternion
const scale = new Vector3
const one = new Vector3(1, 1, 1)
const matrix = new Matrix4
const inverse = new Matrix4

/**
 * Puts the object of a rigid body, the parent of `group`, where the body is right away, as Rapier would only move it at its next step, and the group back to its middle, keeping its scale for the caller to grow back.
 * For an object that something showed by its group while the body was out of the physics, such as a carried prop.
 */
export function settle(body: RapierRigidBody, group: Object3D) {
  const holder = group.parent
  if (holder) {
    const translation = body.translation()
    const rotation = body.rotation()
    matrix.compose(position.set(translation.x, translation.y, translation.z), quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w), one)
    if (holder.parent) {
      holder.parent.updateWorldMatrix(true, false)
      matrix.premultiply(inverse.copy(holder.parent.matrixWorld).invert())
    }
    matrix.decompose(holder.position, holder.quaternion, scale)
    holder.updateMatrixWorld(true)
  }
  group.position.set(0, 0, 0)
  group.quaternion.identity()
}

/**
 * Hands an object that a fusion flew around by `group`, the group inside its rigid body’s object, back to the physics: the body takes the group’s pose in the world and flies off with the velocities.
 */
export function handBack(body: RapierRigidBody, group: Object3D, velocity: Vec3, spin: Vec3) {
  group.updateWorldMatrix(true, false)
  group.matrixWorld.decompose(position, quaternion, scale)
  body.setTranslation(position, false)
  body.setRotation(quaternion, false)
  settle(body, group)
  body.setEnabled(true)
  body.setLinvel({
    x: velocity[0],
    y: velocity[1],
    z: velocity[2],
  }, true)
  body.setAngvel({
    x: spin[0],
    y: spin[1],
    z: spin[2],
  }, true)
}
