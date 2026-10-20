import type {PerspectiveCamera} from 'three/webgpu'

import {clamp, degreesToRadians, deltaAngle, lerp} from 'math'
import {Matrix4, Quaternion, Spherical, Vector3} from 'three/webgpu'

const up = new Vector3(0, 1, 0)
const identity = new Quaternion
export const inspectionFov = 50
const minDistanceFactor = 0.5
const maxDistanceFactor = 1.75

/** How the camera orbits one object. Distances are measured from the orbit’s center, in meters. */
export type OrbitSettings = {
  /** how strongly the background blurs, relative to the default lens; 0 keeps it sharp */
  blur?: number
  /** the height the camera stays 18 cm below; no limit unless set */
  ceilingY?: number
  /** where the orbit starts, framing the radius by default */
  distance?: number
  /** the direction from the center the orbit starts in, instead of wherever the camera is */
  facing?: [number, number, number]
  /** the height the camera stays 18 cm above; no limit unless set */
  floorY?: number
  /** the farthest S gets, 1.75 times the default distance unless set */
  maxDistance?: number
  /** the closest W gets, half the default distance unless set */
  minDistance?: number
  /** how far the orbit tilts up or down from where it started, in radians; no limit unless set */
  pitchLimit?: number
  /** radius of the sphere the default distance frames at the inspection field of view */
  radius: number
  /** how far the orbit turns left or right of where it started, in radians; no limit unless set */
  yawLimit?: number
}

/** A temporary camera owner; orbiting never changes the player’s physical pose. */
export default class OrbitInspection {
  readonly originalFov: number
  readonly originalPosition: Vector3
  readonly originalRotation: Quaternion
  readonly radius: number
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
  private readonly startPhi: number

  private readonly startTheta: number
  private readonly targetRotation = new Quaternion
  private theta: number

  constructor(readonly camera: PerspectiveCamera, center: Vector3, private readonly settings: OrbitSettings) {
    const {radius, distance, minDistance, maxDistance} = settings
    if (!(radius > 0) || !Number.isFinite(radius)) {
      throw new Error('Inspection radius must be positive.')
    }
    for (const value of [distance, minDistance, maxDistance]) {
      if (value !== undefined && !(value > 0 && Number.isFinite(value))) {
        throw new Error('Inspection distances must be positive.')
      }
    }
    this.radius = radius
    this.originalPosition = camera.position.clone()
    this.originalRotation = camera.quaternion.clone()
    this.originalFov = camera.fov
    this.pivot = center.clone()
    this.sphere.setFromVector3(camera.position.clone().sub(center))
    const start = settings.facing ? new Spherical : this.sphere
    if (settings.facing) {
      start.setFromVector3(new Vector3(...settings.facing))
    }
    this.startTheta = start.theta
    this.startPhi = start.phi
    this.theta = start.theta
    this.phi = start.phi
  }

  addInput(yaw: number, pitch: number) {
    if (this.returning || !Number.isFinite(yaw) || !Number.isFinite(pitch)) {
      return
    }
    const {yawLimit = Infinity, pitchLimit = Infinity} = this.settings
    // Limited turns are measured from the start, so a large input can’t wrap around past the limit. The target only moves by
    // the clamped change; resetting it to the start’s angle could put it a full turn away from the camera, which would spin.
    const offset = deltaAngle(this.startTheta, this.theta)
    this.theta += Number.isFinite(yawLimit) ? clamp(offset + yaw, -yawLimit, yawLimit) - offset : yaw
    this.phi = clamp(this.phi - pitch, Math.max(0.05, this.startPhi - pitchLimit), Math.min(Math.PI - 0.05, this.startPhi + pitchLimit))
  }

  adjustDistance(amount: number) {
    if (this.returning || !Number.isFinite(amount)) {
      return
    }
    const [min, max] = this.getDistanceFactors()
    this.distanceFactor = clamp(this.distanceFactor + amount, min, max)
  }

  getProximity(center: Vector3) {
    const [min, max] = this.getDistanceFactors()
    const distanceFactor = this.camera.position.distanceTo(center) / this.getBaseDistance()
    return 1 - clamp((distanceFactor - min) / (max - min), 0, 1)
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
      const [min, max] = this.getDistanceFactors()
      const distance = this.getBaseDistance() * clamp(this.distanceFactor, min, max)
      const floorLimit = Math.acos(clamp(((this.settings.floorY ?? -Infinity) + 0.18 - center.y) / distance, -1, 1))
      const ceilingLimit = Math.acos(clamp(((this.settings.ceilingY ?? Infinity) - 0.18 - center.y) / distance, -1, 1))
      this.sphere.theta = lerp(this.sphere.theta, this.theta, blend)
      this.sphere.phi = lerp(this.sphere.phi, clamp(this.phi, ceilingLimit, floorLimit), blend)
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
    if (this.settings.distance) {
      return this.settings.distance
    }
    const vertical = degreesToRadians(inspectionFov)
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect)
    return this.radius / Math.sin(Math.min(vertical, horizontal) / 2) * 0.96
  }

  /** the distance limits as fractions of the default distance */
  private getDistanceFactors() {
    const base = this.getBaseDistance()
    const min = this.settings.minDistance === undefined ? minDistanceFactor : this.settings.minDistance / base
    const max = this.settings.maxDistance === undefined ? maxDistanceFactor : this.settings.maxDistance / base
    return [Math.min(min, 1), Math.max(max, 1)] as const
  }

  private lookAt(center: Vector3) {
    return this.lookRotation.setFromRotationMatrix(this.matrix.lookAt(this.camera.position, center, up))
  }
}
