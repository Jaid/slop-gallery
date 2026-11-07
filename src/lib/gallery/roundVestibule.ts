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
  /** how wide it opens straight across in the plane touching the wall at its middle, where that differs from {@link RoundVestibule.arch}: as wide as whatever it opens onto */
  width?: number
}
/** a round anteroom, its wall touching the walls or the passages it opens onto back to back, each through an arch */
export type RoundVestibule = {
  /** what every arch opens as in the plane touching the wall at its middle, where it meets what lies beyond: its width straight across, unless the arch has a width of its own */
  arch: Omit<WallOpening, 'name' | 'u'>
  arches: ReadonlyArray<VestibuleArch>
  /** in x and z of the frame every point asked about is given in, usually the world’s */
  center: readonly [x: number, z: number]
  /** the radius of its wall’s center line */
  radius: number
}

/** What the arch opens as in the plane touching the vestibule’s wall at its middle: the vestibule’s arch, as wide as the arch says. */
export function vestibuleArchOpening(vestibule: RoundVestibule, arch: VestibuleArch): Omit<WallOpening, 'name' | 'u'> {
  return arch.width === undefined ? vestibule.arch : {
    ...vestibule.arch,
    width: arch.width,
  }
}

/** how far an arch’s jambs stand from its middle round the vestibule’s center */
const jambAngle = (vestibule: RoundVestibule, arch: VestibuleArch) => Math.asin(vestibuleArchOpening(vestibule, arch).width / 2 / vestibule.radius)

/**
 * An arch’s opening through the vestibule’s round wall, without its place along the wall: along the wall’s center line, between the same jambs as its opening straight across, see {@link vestibuleArchOpening}, and as high.
 * Behind the wall, its reveal lines it on to the plane touching the wall at its middle, see `roundRevealGeometry`.
 */
export function roundVestibuleHole(vestibule: RoundVestibule, arch: VestibuleArch) {
  return {
    ...vestibuleArchOpening(vestibule, arch),
    width: jambAngle(vestibule, arch) * vestibule.radius * 2,
  }
}

/**
 * The vestibule’s round wall as a room’s own, relative to the room’s origin, given in the vestibule’s frame: one ring facing its center, with a hole for every arch, named after it.
 * Its middle lies halfway between its arches, so that the seam where its ends meet lies across from them.
 */
export function roundVestibuleWall(vestibule: RoundVestibule, origin: Vec3, height: number): RoomWall {
  const middle = vestibule.arches.reduce((sum, arch) => sum + arch.angle, 0) / vestibule.arches.length
  return {
    center: [vestibule.center[0] + Math.cos(middle) * vestibule.radius - origin[0], 0, vestibule.center[1] + Math.sin(middle) * vestibule.radius - origin[2]],
    rotation: Math.atan2(-Math.cos(middle), -Math.sin(middle)),
    width: Math.PI * 2 * vestibule.radius,
    height,
    curveRadius: vestibule.radius,
    // Flat frames would stand off its curve.
    sticky: false,
    holes: Object.fromEntries(vestibule.arches.map(arch => [arch.name, {
      ...roundVestibuleHole(vestibule, arch),
      u: (arch.angle - middle) * vestibule.radius,
    }])),
  }
}

/** Whether the point, relative to the vestibule’s center, lies under one of its arches, at least `margin` meters from its jambs, from its center out to `margin` meters beyond the plane touching its wall at the arch’s middle, where whatever it opens onto takes over. */
const underArch = (vestibule: RoundVestibule, x: number, z: number, arch: VestibuleArch, margin: number) => {
  const along = x * Math.cos(arch.angle) + z * Math.sin(arch.angle)
  const across = z * Math.cos(arch.angle) - x * Math.sin(arch.angle)
  return along >= 0 && along <= vestibule.radius + margin + 1e-6 && Math.abs(across) <= vestibuleArchOpening(vestibule, arch).width / 2 - margin + 1e-6
}

/** Whether the point lies on the vestibule’s floor, at least `margin` meters from its walls’ center lines: within its round wall, or on under one of its arches to the plane touching the wall there. */
export function insideRoundVestibule(vestibule: RoundVestibule, x: number, z: number, margin = 0) {
  const dx = x - vestibule.center[0]
  const dz = z - vestibule.center[1]
  return Math.hypot(dx, dz) <= vestibule.radius - margin + 1e-6 || vestibule.arches.some(arch => underArch(vestibule, dx, dz, arch, margin))
}

/**
 * The vestibule’s floor plan relative to its center, as a shape in x and −z, the way a shape lies flat once turned about x by −90°: the round wall’s center line, and under every arch a threshold out to the plane touching the wall there, which the floor beyond the arch starts from.
 */
export function roundVestibuleFloorShape(vestibule: RoundVestibule) {
  const {radius} = vestibule
  /** Where the threshold under the arch at the angle, in the shape’s plane, reaches the plane touching the wall, `lateral` meters to the side of its middle, toward greater angles. */
  const thresholdCorner = (angle: number, lateral: number) => [Math.cos(angle) * radius - Math.sin(angle) * lateral, Math.sin(angle) * radius + Math.cos(angle) * lateral] as const
  const shape = new Shape
  // In the shape’s plane, angles turn the other way round than in the world’s x and z.
  const corners = vestibule.arches.map(arch => ({
    angle: -arch.angle,
    half: vestibuleArchOpening(vestibule, arch).width / 2,
    jamb: jambAngle(vestibule, arch),
  })).toSorted((a, b) => a.angle - b.angle)
  shape.moveTo(...thresholdCorner(corners[0].angle, corners[0].half))
  for (const [index, {angle, jamb}] of corners.entries()) {
    const next = corners[(index + 1) % corners.length]
    const nextAngle = next.angle + (index === corners.length - 1 ? Math.PI * 2 : 0)
    shape.absarc(0, 0, radius, angle + jamb, nextAngle - next.jamb, false)
    shape.lineTo(...thresholdCorner(nextAngle, -next.half))
    shape.lineTo(...thresholdCorner(nextAngle, next.half))
  }
  return shape
}
