import type {RoomWall} from '#src/rooms/base/Room.ts'
import type {WallOpening} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {Shape} from 'three/webgpu'

/** an arch through the round wall of a vestibule */
export type VestibuleArch = {
  /** the polar angle of its middle round the vestibule’s center, from world x toward world z */
  angle: number
  /** its hole’s name in the vestibule’s wall, after what it opens onto */
  name: string
}
/** a round anteroom, its wall touching the walls or the passages it opens onto back to back, each through an arch */
export type RoundVestibule = {
  /** what every arch opens as in the plane touching the wall at its middle, where it meets what lies beyond: its width straight across */
  arch: Omit<WallOpening, 'name' | 'u'>
  arches: ReadonlyArray<VestibuleArch>
  /** in x and z of the frame every point asked about is given in, usually the world’s */
  center: readonly [x: number, z: number]
  /** the radius of its wall’s center line */
  radius: number
}

/** how far an arch’s jambs stand from its middle round the vestibule’s center */
const jambAngle = (vestibule: RoundVestibule) => Math.asin(vestibule.arch.width / 2 / vestibule.radius)

/**
 * An arch’s opening through the vestibule’s round wall, without its place along the wall: along the wall’s center line, between the same jambs as {@link RoundVestibule.arch} straight across, and as high.
 * Behind the wall, its reveal lines it on to the plane touching the wall at its middle, see `roundRevealGeometry`.
 */
export function roundVestibuleHole(vestibule: RoundVestibule) {
  return {
    ...vestibule.arch,
    width: jambAngle(vestibule) * vestibule.radius * 2,
  }
}

/**
 * The vestibule’s round wall as a room’s own, relative to the room’s origin, given in the vestibule’s frame: one ring facing its center, with a hole for every arch, named after it.
 * Its middle lies halfway between its arches, so that the seam where its ends meet lies across from them.
 */
export function roundVestibuleWall(vestibule: RoundVestibule, origin: Vec3, height: number): RoomWall {
  const middle = vestibule.arches.reduce((sum, arch) => sum + arch.angle, 0) / vestibule.arches.length
  const hole = roundVestibuleHole(vestibule)
  return {
    center: [vestibule.center[0] + Math.cos(middle) * vestibule.radius - origin[0], 0, vestibule.center[1] + Math.sin(middle) * vestibule.radius - origin[2]],
    rotation: Math.atan2(-Math.cos(middle), -Math.sin(middle)),
    width: Math.PI * 2 * vestibule.radius,
    height,
    curveRadius: vestibule.radius,
    // Flat frames would stand off its curve.
    sticky: false,
    holes: Object.fromEntries(vestibule.arches.map(arch => [arch.name, {
      ...hole,
      u: (arch.angle - middle) * vestibule.radius,
    }])),
  }
}

/** Whether the point, relative to the vestibule’s center, lies under one of its arches, between its jambs from its center out to the plane touching its wall at the arch’s middle. */
const underArch = (vestibule: RoundVestibule, x: number, z: number, arch: VestibuleArch) => {
  const along = x * Math.cos(arch.angle) + z * Math.sin(arch.angle)
  const across = z * Math.cos(arch.angle) - x * Math.sin(arch.angle)
  return along >= 0 && along <= vestibule.radius + 1e-6 && Math.abs(across) <= vestibule.arch.width / 2 + 1e-6
}

/** Whether the point lies on the vestibule’s floor: within its round wall’s center line, or on under one of its arches to the plane touching the wall there. */
export function insideRoundVestibule(vestibule: RoundVestibule, x: number, z: number) {
  const dx = x - vestibule.center[0]
  const dz = z - vestibule.center[1]
  return Math.hypot(dx, dz) <= vestibule.radius + 1e-6 || vestibule.arches.some(arch => underArch(vestibule, dx, dz, arch))
}

/**
 * The vestibule’s floor plan relative to its center, as a shape in x and −z, the way a shape lies flat once turned about x by −90°: the round wall’s center line, and under every arch a threshold out to the plane touching the wall there, which the floor beyond the arch starts from.
 */
export function roundVestibuleFloorShape(vestibule: RoundVestibule) {
  const {radius} = vestibule
  const half = vestibule.arch.width / 2
  const jamb = jambAngle(vestibule)
  /** Where the threshold under the arch at the angle, in the shape’s plane, reaches the plane touching the wall, `lateral` meters to the side of its middle, toward greater angles. */
  const thresholdCorner = (angle: number, lateral: number) => [Math.cos(angle) * radius - Math.sin(angle) * lateral, Math.sin(angle) * radius + Math.cos(angle) * lateral] as const
  const shape = new Shape
  // In the shape’s plane, angles turn the other way round than in the world’s x and z.
  const corners = vestibule.arches.map(arch => -arch.angle).toSorted((a, b) => a - b)
  shape.moveTo(...thresholdCorner(corners[0], half))
  for (const [index, angle] of corners.entries()) {
    const next = corners[(index + 1) % corners.length] + (index === corners.length - 1 ? Math.PI * 2 : 0)
    shape.absarc(0, 0, radius, angle + jamb, next - jamb, false)
    shape.lineTo(...thresholdCorner(next, -half))
    shape.lineTo(...thresholdCorner(next, half))
  }
  return shape
}
