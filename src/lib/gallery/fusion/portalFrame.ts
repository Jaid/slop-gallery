import type {Portrait, Vec3} from '../types.ts'

import {clamp} from 'math'

/** where a fusion’s portal floats in front of its work and how the work and what was thrown into it orbit around it */
export type PortalFrame = {
  center: Vec3
  /** horizontal, out of the wall */
  normal: Vec3
  /** the semi-axes of the orbit: along the wall and across it, and how much higher than the portal it passes on the wall’s side, as much lower on the room’s */
  orbit: {
    across: number
    along: number
    tilt: number
  }
  /** of the portal’s glowing disc */
  radius: number
  /** horizontal, along the wall, to the right of someone facing it */
  tangent: Vec3
}
/** how much free room surrounds the work, in meters, as far as the world knows */
export type PortalSurroundings = {
  /** the floor’s height under the work */
  floor: number
  /** how far the room reaches out from the work, along its normal */
  room: number
  /** how far the wall reaches to either side of the portal before another one stands in the way */
  sides: readonly [left: number, right: number]
}

/** the largest side an orbiting work shrinks to, in meters */
export const satelliteSize = 0.8
/** the radius of the portal’s glowing disc, in meters */
export const portalRadius = 0.42
/** how much room an orbiting work keeps from the wall behind it and the ones to the sides, in meters */
const clearance = satelliteSize / 2 + 0.12

/** The portal opens in front of the work at about eye height, as far out as the room lets its orbit pass clear of the wall. */
export function portalFrame(work: Pick<Portrait, 'position' | 'rotation'>, {floor, room, sides}: PortalSurroundings): PortalFrame {
  const normal: Vec3 = [Math.sin(work.rotation), 0, Math.cos(work.rotation)]
  const tangent: Vec3 = [normal[2], 0, -normal[0]]
  const distance = clamp(room * 0.45, 0.95, 1.45)
  const height = clamp(work.position[1], floor + 1.55, floor + 2.05)
  return {
    center: [work.position[0] + normal[0] * distance, height, work.position[2] + normal[2] * distance],
    normal,
    tangent,
    radius: portalRadius,
    orbit: {
      along: clamp(Math.min(...sides) - clearance, 0.85, 1.35),
      across: clamp(distance - clearance, 0.35, 0.8),
      // Steep enough that the satellites pass under the portal in front of it and over it behind it, rather than across it.
      tilt: 0.72,
    },
  }
}
