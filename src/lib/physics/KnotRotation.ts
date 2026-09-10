import type {RigidBody} from '@dimforge/rapier3d-compat'

import {Quaternion} from 'three/webgpu'

/** One gentle revolution every 40 seconds, with colliders following the sculpture. */
export class KnotRotation {
  private readonly increment = new Quaternion
  private readonly rotation = new Quaternion

  step(body: RigidBody, delta: number) {
    // Released sculptures retain normal throwing and settling physics.
    if (!body.isFixed() || !Number.isFinite(delta) || delta <= 0) {
      return
    }
    const halfAngle = delta * Math.PI / 40
    this.increment.set(0, Math.sin(halfAngle), 0, Math.cos(halfAngle))
    this.rotation.copy(body.rotation()).premultiply(this.increment).normalize()
    body.setRotation(this.rotation, true)
  }
}
