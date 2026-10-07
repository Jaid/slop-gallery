import type {PerspectiveCamera} from 'three/webgpu'

import {clamp, degreesToRadians, deltaAngle, lerp} from 'math'
import {Matrix4, Quaternion, Spherical, Vector3} from 'three/webgpu'

const up = new Vector3(0, 1, 0)
const identity = new Quaternion
const inspectionFov = 50
const minDistanceFactor = 0.5
const maxDistanceFactor = 1.75

/** A temporary camera owner; orbiting never changes the player’s physical pose. */
export default class OrbitInspection {
  readonly originalFov: number
  readonly originalPosition: Vector3
  readonly originalRotation: Quaternion
  returning = false
  private readonly aimOffset = new Quaternion
  private readonly destination = new Spherical
  private distanceFactor = 1
  private readonly lookRotation = new Quaternion
  private readonly matrix = new Matrix4
  private readonly offset = new Vector3
  private orbiting = false
  private phi: number
  private readonly pivot: Vector3
  private readonly sphere = new Spherical
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
    this.phi = clamp(this.phi - pitch, 0.05, Math.PI - 0.05)
  }

  adjustDistance(amount: number) {
    if (this.returning || !Number.isFinite(amount)) {
      return
    }
    this.distanceFactor = clamp(this.distanceFactor + amount, minDistanceFactor, maxDistanceFactor)
  }

  getProximity(center: Vector3) {
    const distanceFactor = this.camera.position.distanceTo(center) / this.getBaseDistance()
    return 1 - clamp((distanceFactor - minDistanceFactor) / (maxDistanceFactor - minDistanceFactor), 0, 1)
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
      this.orbiting = false
      // Return around the object, not straight through it after a half orbit.
      this.sphere.setFromVector3(this.offset.copy(this.camera.position).sub(this.pivot))
      this.destination.setFromVector3(this.offset.copy(this.originalPosition).sub(this.pivot))
      const angle = deltaAngle(this.sphere.theta, this.destination.theta)
      this.sphere.theta += angle * blend
      this.sphere.phi = lerp(this.sphere.phi, this.destination.phi, blend)
      this.sphere.radius = lerp(this.sphere.radius, this.destination.radius, blend)
      this.camera.position.copy(this.pivot).add(this.offset.setFromSpherical(this.sphere))
      this.targetRotation.copy(this.originalRotation)
      this.camera.quaternion.slerp(this.targetRotation, blend)
    } else {
      if (!this.orbiting) {
        // (Re)enter from wherever the camera currently is, e.g. after an interrupted return.
        this.orbiting = true
        this.sphere.setFromVector3(this.offset.copy(this.camera.position).sub(this.pivot))
        this.theta = this.sphere.theta + deltaAngle(this.sphere.theta, this.theta)
      }
      // How far the view is turned away from the Knot, measured before this frame’s move.
      // Only this residual eases out; orbiting itself must never pull the Knot off-center.
      this.aimOffset.copy(this.lookAt(this.pivot)).invert().multiply(this.camera.quaternion).slerp(identity, blend)
      this.pivot.copy(center)
      // Smooth on the sphere around the Knot rather than in world space, so fast orbits
      // follow the arc instead of cutting a chord toward (or through) the object.
      const distance = this.getBaseDistance() * this.distanceFactor
      const floorLimit = Math.acos(clamp((0.18 - center.y) / distance, -1, 1))
      this.sphere.theta = lerp(this.sphere.theta, this.theta, blend)
      this.sphere.phi = lerp(this.sphere.phi, Math.min(this.phi, floorLimit), blend)
      this.sphere.radius = lerp(this.sphere.radius, distance, blend)
      this.camera.position.copy(center).add(this.offset.setFromSpherical(this.sphere))
      this.camera.quaternion.copy(this.lookAt(center)).multiply(this.aimOffset)
    }
    this.camera.fov = lerp(this.camera.fov, fov, blend)
    this.camera.updateProjectionMatrix()
    if (this.returning && this.camera.position.distanceTo(this.originalPosition) < 0.001 && this.camera.quaternion.angleTo(this.originalRotation) < 0.001 && Math.abs(this.camera.fov - this.originalFov) < 0.001) {
      this.restore()
      return true
    }
    return false
  }

  private getBaseDistance() {
    const vertical = degreesToRadians(inspectionFov)
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect)
    return this.radius / Math.sin(Math.min(vertical, horizontal) / 2) * 0.96
  }

  private lookAt(center: Vector3) {
    return this.lookRotation.setFromRotationMatrix(this.matrix.lookAt(this.camera.position, center, up))
  }
}
