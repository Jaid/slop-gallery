import type {RigidBody} from '@dimforge/rapier3d-compat'

import {RigidBodyType} from '@dimforge/rapier3d-compat'
import {Quaternion} from 'three/webgpu'

/** One gentle revolution every 40 seconds until an exhibited Knot is physically disturbed. */
export default class KnotRotation {
  private readonly increment = new Quaternion
  private readonly released = new WeakSet<RigidBody>
  private readonly rotation = new Quaternion

  isShowcased(body: RigidBody) {
    return !this.released.has(body)
  }

  release(body: RigidBody) {
    if (this.released.has(body)) {
      return false
    }
    this.released.add(body)
    if (body.isFixed()) {
      body.setBodyType(RigidBodyType.Dynamic, true)
    }
    body.wakeUp()
    return true
  }

  step(body: RigidBody, delta: number) {
    if (this.released.has(body) || !body.isFixed() || !Number.isFinite(delta) || delta <= 0) {
      return
    }
    const halfAngle = delta * Math.PI / 40
    this.increment.set(0, Math.sin(halfAngle), 0, Math.cos(halfAngle))
    this.rotation.copy(body.rotation()).premultiply(this.increment).normalize()
    body.setRotation(this.rotation, true)
  }
}
