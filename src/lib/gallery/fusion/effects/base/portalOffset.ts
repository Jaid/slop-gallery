import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

/** where something is relative to a portal’s middle: along the wall to the right, up and out into the room, in meters */
export type PortalOffset = readonly [along: number, up: number, out: number]

/** Where the offset from the middle of the portal of `frame` lies in the world. */
export function offsetPosition({center, normal, tangent}: PortalFrame, [along, up, out]: PortalOffset): Vec3 {
  return [center[0] + tangent[0] * along + normal[0] * out, center[1] + up, center[2] + tangent[2] * along + normal[2] * out]
}
