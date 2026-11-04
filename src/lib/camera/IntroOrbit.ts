import type {Vec3} from 'math'

import {wrapAngle} from 'math'

/** where a camera on an {@link IntroOrbit} is and where it looks, in the player’s yaw and pitch: yaw 0 looks toward −z, positive pitch looks up */
export type IntroPose = {
  pitch: number
  position: Vec3
  yaw: number
}

/** Which way an {@link IntroOrbit} circles: 1 turns its angle up, from +z toward +x, −1 down. */
export type IntroDirection = -1 | 1

/** A camera circling a point on a level ring above it, always looking at it, as the scene behind the first menu. */
export default class IntroOrbit {
  /** how far the camera stands above the point it looks at, in meters */
  readonly elevation: number
  /** the seconds of one full turn */
  readonly period: number
  /** how far the camera stands from the point it looks at horizontally, in meters */
  readonly radius: number
  /** the angle the camera starts at, in radians around the y axis, 0 on the +z side of the point and π/2 on the +x side */
  readonly start: number
  /** the radius of what the camera looks at, which stays in focus while the background beyond it blurs */
  readonly subject: number
  /** the seconds after the player last turned the camera before it circles on its own again */
  readonly takeover: number
  /** the point the camera looks at, in world meters */
  readonly target: Vec3

  constructor({elevation, period = 60, radius, start = 0, subject, takeover = 3, target}: {
    elevation: number
    period?: number
    radius: number
    start?: number
    subject: number
    takeover?: number
    target: Vec3
  }) {
    if (!(radius > 0) || !(subject > 0) || !(period > 0) || !(takeover >= 0) || ![elevation, start, ...target].every(Number.isFinite)) {
      throw new RangeError('An intro orbit needs a positive radius, subject and period, a takeover of at least 0 s and finite coordinates.')
    }
    this.subject = subject
    this.takeover = takeover
    this.elevation = elevation
    this.period = period
    this.radius = radius
    this.start = start
    this.target = target
  }

  /** the camera’s distance from the point it looks at, in meters */
  get distance() {
    return Math.hypot(this.radius, this.elevation)
  }

  /** how fast the camera circles on its own, in radians per second */
  get speed() {
    return 2 * Math.PI / this.period
  }

  /** The angle of the camera circling on its own in `direction`, `time` seconds after the intro began. */
  angleAt(time: number, direction: IntroDirection = 1) {
    return this.start + direction * this.speed * time
  }

  /** The camera’s pose `time` seconds after the intro began, circling on its own in `direction`. */
  pose(time: number, direction: IntroDirection = 1): IntroPose {
    return this.poseAt(this.angleAt(time, direction))
  }

  /** The camera’s pose at `angle` on the ring, in radians around the y axis like {@link start}. */
  poseAt(angle: number): IntroPose {
    const [x, y, z] = this.target
    return {
      position: [x + Math.sin(angle) * this.radius, y + this.elevation, z + Math.cos(angle) * this.radius],
      // Looking back at the target from the angle’s side is looking along −sin, −cos, which is the yaw of the angle itself.
      yaw: wrapAngle(angle),
      pitch: -Math.atan2(this.elevation, this.radius),
    }
  }
}
