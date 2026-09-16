import type {PerspectiveCamera} from 'three/webgpu'

import {MathUtils, Matrix4, Quaternion, Spherical, Vector3} from 'three/webgpu'

const up = new Vector3(0, 1, 0)
const inspectionFov = 50
const minDistanceFactor = 0.5
const maxDistanceFactor = 1.75

/** A temporary camera owner; orbiting never changes the player’s physical pose. */
export default class OrbitInspection {
  readonly originalFov: number
  readonly originalPosition: Vector3
  readonly originalRotation: Quaternion
  returning = false
  private readonly destination = new Spherical
  private distanceFactor = 1
  private readonly matrix = new Matrix4
  private readonly offset = new Vector3
  private phi: number
  private readonly pivot: Vector3
  private readonly sphere = new Spherical
  private readonly targetPosition = new Vector3
  private readonly targetRotation = new Quaternion
  private theta: number

  constructor(readonly camera: PerspectiveCamera, center: Vector3, readonly radius: number) {
    if (!(radius > 0) || !Number.isFinite(radius)) {
      throw new Error('Inspection radius must be positive.')
    }
    this.originalPosition = camera.position.clone()
    this.originalRotation = camera.quaternion.clone()
    this.originalFov = camera.fov
    this.pivot = center.clone()
    this.sphere.setFromVector3(camera.position.clone().sub(center))
    this.theta = this.sphere.theta
    this.phi = this.sphere.phi
  }

  addInput(yaw: number, pitch: number) {
    if (this.returning || !Number.isFinite(yaw) || !Number.isFinite(pitch)) {
      return
    }
    this.theta += yaw
    this.phi = MathUtils.clamp(this.phi - pitch, 0.05, Math.PI - 0.05)
  }

  adjustDistance(amount: number) {
    if (this.returning || !Number.isFinite(amount)) {
      return
    }
    this.distanceFactor = MathUtils.clamp(this.distanceFactor + amount, minDistanceFactor, maxDistanceFactor)
  }

  getProximity(center: Vector3) {
    const distanceFactor = this.camera.position.distanceTo(center) / this.getBaseDistance()
    return 1 - MathUtils.clamp((distanceFactor - minDistanceFactor) / (maxDistanceFactor - minDistanceFactor), 0, 1)
  }

  release() {
    this.returning = true
  }

  restore() {
    this.camera.position.copy(this.originalPosition)
    this.camera.quaternion.copy(this.originalRotation)
    this.camera.fov = this.originalFov
    this.camera.updateProjectionMatrix()
  }

  update(center: Vector3, delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) {
      return false
    }
    const blend = 1 - Math.exp(-Math.min(delta, 0.06) * 10)
    const fov = this.returning ? this.originalFov : inspectionFov
    if (this.returning) {
      // Return around the object, not straight through it after a half orbit.
      this.sphere.setFromVector3(this.offset.copy(this.camera.position).sub(this.pivot))
      this.destination.setFromVector3(this.offset.copy(this.originalPosition).sub(this.pivot))
      const angle = this.destination.theta - this.sphere.theta
      this.sphere.theta += Math.atan2(Math.sin(angle), Math.cos(angle)) * blend
      this.sphere.phi = MathUtils.lerp(this.sphere.phi, this.destination.phi, blend)
      this.sphere.radius = MathUtils.lerp(this.sphere.radius, this.destination.radius, blend)
      this.camera.position.copy(this.pivot).add(this.offset.setFromSpherical(this.sphere))
      this.targetRotation.copy(this.originalRotation)
    } else {
      this.pivot.copy(center)
      const distance = this.getBaseDistance() * this.distanceFactor
      const floorLimit = Math.acos(MathUtils.clamp((0.18 - center.y) / distance, -1, 1))
      const phi = Math.min(this.phi, floorLimit)
      this.sphere.set(distance, phi, this.theta)
      this.targetPosition.copy(center).add(this.offset.setFromSpherical(this.sphere))
      this.camera.position.lerp(this.targetPosition, blend)
      this.targetRotation.setFromRotationMatrix(this.matrix.lookAt(this.camera.position, center, up))
    }
    this.camera.quaternion.slerp(this.targetRotation, blend)
    this.camera.fov = MathUtils.lerp(this.camera.fov, fov, blend)
    this.camera.updateProjectionMatrix()
    if (this.returning && this.camera.position.distanceTo(this.originalPosition) < 0.001 && this.camera.quaternion.angleTo(this.originalRotation) < 0.001 && Math.abs(this.camera.fov - this.originalFov) < 0.001) {
      this.restore()
      return true
    }
    return false
  }

  private getBaseDistance() {
    const vertical = MathUtils.degToRad(inspectionFov)
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect)
    return this.radius / Math.sin(Math.min(vertical, horizontal) / 2) * 0.96
  }
}
