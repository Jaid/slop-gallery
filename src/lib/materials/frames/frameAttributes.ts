import type {Node} from 'three/webgpu'

import {attribute, float, max, mx_noise_float, positionLocal, select, uv, vec2, vec3} from 'three/tsl'

import {frameShapeAttribute, ornamentMember} from '#src/lib/frames/frameGeometry.ts'

/** what frame materials know about the point they shade, see {@link frameSurface} */
export type FrameSurface = ReturnType<typeof frameSurface>

type Float = Node<'float'>

/**
 * What frame materials know about the point they shade, from the attributes `frameGeometry.ts` gives every part of a frame.
 *
 * Read it inside a material’s constructor: the nodes belong to the material that uses them.
 */
export function frameSurface() {
  const shape = attribute<'vec4'>(frameShapeAttribute, 'vec4')
  const coordinates = uv()
  const member = shape.x
  const isOrnament = member.greaterThanEqual(ornamentMember - 0.5)
  const along = coordinates.x
  const across = coordinates.y
  const openingHalf = shape.w
  const halfLength = openingHalf.add(shape.y)
  return {
    /** meters along the member from its middle, or the ornament’s own x */
    along,
    /** meters along the profile from the sight edge, or the ornament’s own y */
    across,
    /** from −1 on a sharp ridge to 1 deep in a hollow */
    cavity: shape.z,
    /** 1 on ornaments, 0 on the members */
    isOrnament: select(isOrnament, float(1), float(0)),
    /** the member, 0 to 3 clockwise from the top, or {@link ornamentMember} and up for ornaments */
    member,
    /** how far out past the opening the point lies, on the members */
    reach: shape.y,
    /** how far along the member the point lies from the nearer miter, on the members */
    toCorner: halfLength.sub(along.abs()),
    /** half the member’s length where the point lies, from miter to miter */
    halfLength,
    /** half the opening’s side the member runs along, the same all across the member */
    openingHalf,
    /** a value from 0 to 1 of its own for every member and every kind of ornament, for giving each piece its own tone */
    piece: mx_noise_float(vec3(member.mul(17.31), 3.7, 1.9)).mul(0.5).add(0.5),
    /** the frame’s local position, its middle at the work’s */
    position: positionLocal,
    /** the coordinates along and across, in meters */
    plane: vec2(along, across),
  }
}

/**
 * A period close to `period` that fits a whole number of times, or a whole and a half with `half`, into each member from its middle to its miter `reach` meters out past the opening, so a pattern along the members meets itself in the miters.
 * `openingHalf` is {@link frameSurface}’s; the period is the same all across the member, so a band of pattern stays straight, and only meets exactly at the reach it was fitted for.
 */
export function fittedPeriod(openingHalf: Float, period: number, reach: number, half = false) {
  const length = openingHalf.add(reach)
  const count = half ? max(length.div(period).sub(0.5).round(), float(0)).add(0.5) : max(length.div(period).round(), float(1))
  return length.div(count)
}
