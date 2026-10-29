import type {Vec3} from '../types.ts'
import type {LogShape} from './LogGeometry.ts'

import lodge from '../lodge.ts'

/**
 * The lodge’s log fire, in the fire’s own frame: the origin sits on the room floor beneath the middle of the log pair, +y is up and +z points out of the firebox into the room. The hearth top is at 0.2 m.
 *
 * The fireplace group is turned by 180° around y, so this frame is mirrored relative to the room.
 */
const fire = {
  /** fire origin inside the `lodge-fireplace` group */
  position: [0, 0, -4.2] as Vec3,
  /** the plain log pair of fast graphics */
  logs: {
    /** z of each log’s axis */
    offsets: [-0.27, 0.27],
    y: 0.42,
    length: 1.65,
    radiusTop: 0.15,
    radiusBottom: 0.18,
  },
  /** the irregular, burning firewood of heavy graphics, close to the plain pair so collisions barely change */
  pile: [
    {
      position: [0.02, 0.45, 0.27],
      yaw: -0.05,
      pitch: 0,
      inward: -1,
      shape: {
        length: 1.65,
        radiusTop: 0.15,
        radiusBottom: 0.18,
        seed: 0.21,
      },
    },
    {
      position: [-0.03, 0.455, -0.255],
      yaw: 0.07,
      pitch: 0,
      inward: 1,
      shape: {
        length: 1.6,
        radiusTop: 0.14,
        radiusBottom: 0.17,
        seed: 0.68,
      },
    },
    // A thinner branch laid across both logs.
    {
      position: [0.14, 0.6575, 0],
      yaw: 0.62,
      // Resting on both logs, which differ in thickness and lumps.
      pitch: 0.09,
      inward: 0,
      shape: {
        length: 1.3,
        radiusTop: 0.07,
        radiusBottom: 0.085,
        seed: 0.43,
      },
    },
  ] as ReadonlyArray<{
    /** the direction toward the fire along the log’s local z, before the yaw */
    inward: -1 | 0 | 1
    /** tilt of the log’s axis out of the horizontal in radians, applied before the yaw */
    pitch: number
    position: Vec3
    shape: LogShape
    /** turn around y in radians */
    yaw: number
  }>,
  embers: {
    y: 0.25,
    /** reaches past both log ends, but stays on the hearth and inside the firebox */
    size: [2.15, 0.9] as [number, number],
    /** the plain glowing rectangle of fast graphics */
    glowSize: [1.9, 0.7] as [number, number],
  },
  coals: {
    count: 90,
  },
  flames: {
    /** x range the flame sheets are spread over */
    spread: 0.62,
    /** base of the flames rising from the ember gap between the logs */
    gapY: 0.3,
    /** base of the smaller tongues licking over the top of each log */
    logTopY: 0.55,
  },
  light: {
    /** high above the front log: the log faces turned toward the room stay dark against the flames, the light’s falloff cannot blow out the wood right beside it, and it still reaches the floor in front of the hearth */
    position: [0, 1.1, 0.3] as Vec3,
    /** fast graphics have no flames, only the glowing bed, so their light sits low in front of the logs */
    glowPosition: [0, 0.7, 0.35] as Vec3,
    /** the light’s steady strength over the glowing bed, against the flames’ 68 before flickering, which averages 0.9 */
    glowIntensity: 52,
  },
  sparks: {
    count: 48,
    /** sparks die out well below the lintel at 1.9 m */
    maximumHeight: 1.55,
  },
} as const

/** The fire origin in world space, rotated with the fireplace by 180° around y. */
export const fireWorldOrigin: Vec3 = [lodge.center[0] - fire.position[0], lodge.floorY + fire.position[1], lodge.center[1] - fire.position[2]]

export default fire
