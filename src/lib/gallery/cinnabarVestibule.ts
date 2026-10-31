import {Shape} from 'three/webgpu'

import {bastionArch} from './bastion.ts'
import {cinnabarVestibule} from './cinnabar.ts'
import roomOrigins from './layout.ts'

/** an arch through the round wall of the Cinnabar’s vestibule */
export type VestibuleArch = {
  /** the polar angle of its middle round the vestibule’s center, from world x toward world z */
  angle: number
  /** its hole’s name in the vestibule’s wall, after the room it opens onto */
  name: string
}

const {center, radius} = cinnabarVestibule
const floorY = roomOrigins.cinnabar[1]
/** Every arch lines up with the approach’s vault, which ends where the plane touching the vestibule’s wall at the west arch’s middle crosses its center line. */
const half = bastionArch.width / 2
/** how far an arch’s jambs stand from its middle round the vestibule’s center */
const jambAngle = Math.asin(half / radius)

/** The vestibule’s arches: south into the Cinnabar, through the middle of its north wall, and west onto the Fortress’ approach. */
export const vestibuleArches = [
  {
    name: 'cinnabar',
    angle: Math.PI / 2,
  },
  {
    name: 'fortress',
    angle: Math.PI,
  },
] as const satisfies ReadonlyArray<VestibuleArch>

/**
 * An arch’s opening through the vestibule’s round wall, without its place along the wall: along the wall’s center line, as wide as the approach’s vault spans between its walls’ center lines, straight across, and as high.
 * Behind the wall, its reveal lines it on to the plane touching the wall at its middle, where it opens as the approach’s arch does, see `roundRevealGeometry`.
 */
export const vestibuleArchHole = {
  width: jambAngle * radius * 2,
  height: bastionArch.height,
  profile: 'arch',
} as const

/** Whether the point, relative to the vestibule’s center, lies under the arch, between its jambs from the vestibule’s center out to the plane touching its wall at the arch’s middle. */
const underArch = (x: number, z: number, {angle}: VestibuleArch) => {
  const along = x * Math.cos(angle) + z * Math.sin(angle)
  const across = z * Math.cos(angle) - x * Math.sin(angle)
  return along >= 0 && along <= radius + 1e-6 && Math.abs(across) <= half + 1e-6
}

/** The Cinnabar’s floor height under the point in its vestibule, which lies outside its rectangular floor plan: within the round wall’s center line, and on under every arch to the plane touching the wall there. */
export function cinnabarVestibuleFloor(x: number, z: number) {
  const dx = x - center[0]
  const dz = z - center[1]
  return Math.hypot(dx, dz) <= radius + 1e-6 || vestibuleArches.some(arch => underArch(dx, dz, arch)) ? floorY : undefined
}

/**
 * The vestibule’s floor plan relative to its center, as a shape in x and −z, the way a shape lies flat once turned about x by −90°: the round wall’s center line, and under every arch a threshold out to the plane touching the wall there, which the floor beyond the arch starts from.
 */
export function vestibuleFloorShape() {
  const shape = new Shape
  // In the shape’s plane, angles turn the other way round than in the world’s x and z.
  const corners = vestibuleArches.map(({angle}) => -angle).toSorted((a, b) => a - b)
  shape.moveTo(...thresholdCorner(corners[0], half))
  for (const [index, angle] of corners.entries()) {
    const next = corners[(index + 1) % corners.length] + (index === corners.length - 1 ? Math.PI * 2 : 0)
    shape.absarc(0, 0, radius, angle + jambAngle, next - jambAngle, false)
    shape.lineTo(...thresholdCorner(next, -half))
    shape.lineTo(...thresholdCorner(next, half))
  }
  return shape
}

/** Where the threshold under the arch at the angle, in a plane, reaches the plane touching the wall, `lateral` meters to the side of its middle, toward greater angles. */
function thresholdCorner(angle: number, lateral: number) {
  return [Math.cos(angle) * radius - Math.sin(angle) * lateral, Math.sin(angle) * radius + Math.cos(angle) * lateral] as const
}
