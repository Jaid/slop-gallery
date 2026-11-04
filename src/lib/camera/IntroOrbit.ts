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
  /** the point the camera looks at, in world meters */
  readonly target: Vec3

  constructor({elevation, period = 60, radius, start = 0, target}: {
    elevation: number
    period?: number
    radius: number
    start?: number
    target: Vec3
  }) {
    if (!(radius > 0) || !(period > 0) || ![elevation, start, ...target].every(Number.isFinite)) {
      throw new RangeError('An intro orbit needs a positive radius and period and finite coordinates.')
    }
    this.elevation = elevation
    this.period = period
    this.radius = radius
    this.start = start
    this.target = target
  }

  /** The camera’s pose `time` seconds after the intro began, circling in `direction`. */
  pose(time: number, direction: IntroDirection = 1): IntroPose {
    const angle = this.start + direction * 2 * Math.PI * time / this.period
    const [x, y, z] = this.target
    return {
      position: [x + Math.sin(angle) * this.radius, y + this.elevation, z + Math.cos(angle) * this.radius],
      // Looking back at the target from the angle’s side is looking along −sin, −cos, which is the yaw of the angle itself.
      yaw: wrapAngle(angle),
      pitch: -Math.atan2(this.elevation, this.radius),
    }
  }
}
