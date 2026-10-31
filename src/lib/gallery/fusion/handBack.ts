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
 * Hands an object that a fusion flew around by `group`, the group inside its rigid body’s object, back to the physics: the body takes the group’s pose in the world and flies off with the velocities.
 * The body’s object follows right away, as Rapier would only move it at its next step, and the group returns to its middle, keeping its scale for the caller to grow back.
 */
export function handBack(body: RapierRigidBody, group: Object3D, velocity: Vec3, spin: Vec3) {
  group.updateWorldMatrix(true, false)
  group.matrixWorld.decompose(position, quaternion, scale)
  body.setTranslation(position, false)
  body.setRotation(quaternion, false)
  const holder = group.parent
  if (holder) {
    matrix.compose(position, quaternion, one)
    if (holder.parent) {
      holder.parent.updateWorldMatrix(true, false)
      matrix.premultiply(inverse.copy(holder.parent.matrixWorld).invert())
    }
    matrix.decompose(holder.position, holder.quaternion, scale)
    holder.updateMatrixWorld(true)
  }
  group.position.set(0, 0, 0)
  group.quaternion.identity()
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
