import type {Node} from 'three/webgpu'

import {atan, float, vec2, vec3} from 'three/tsl'

import {inkFill, inkLine} from '../../../lib/atelier.ts'
import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Periodic identities and centered coordinates; integer periods close both of the knot’s UV seams. */
export function ornamentCell(tube: Node<'vec2'>, columns: number, rows: number, seed = 0) {
  const period = vec2(columns, rows)
  const grid = tube.mul(period)
  const id = wrapCell(grid.floor(), period)
  const random = cellNoiseVec3(vec3(id, seed + 0.5))
  return {
    grid,
    id,
    random,
    q: grid.fract().sub(0.5),
  }
}

export function turn(q: Node<'vec2'>, angle: Node<'float'> | number) {
  // The explicit matrix also makes the direction of layered optical rotations unambiguous.
  const a = typeof angle === 'number' ? float(angle) : angle
  return vec2(q.x.mul(a.cos()).sub(q.y.mul(a.sin())), q.x.mul(a.sin()).add(q.y.mul(a.cos())))
}

export function polarAngle(q: Node<'vec2'>) {
  return atan(q.y, q.x.add(1e-7))
}

/** Signed-distance line and fill, with subpixel energy conservation instead of hard thresholds. */
export const etch = (distance: Node<'float'>, width: number, footprint = distance.fwidth()) => inkLine(distance, width, footprint)
export const enamel = (distance: Node<'float'>, footprint = distance.fwidth()) => inkFill(distance, footprint)

/** Differentiate before fract; a periodic seam is not a large pixel footprint. */
export function repeatLine(cycles: Node<'float'>, width: number, footprint = cycles.fwidth()) {
  return etch(cycles.fract().sub(0.5), width, footprint)
}

/** Analytic angular footprint avoids the atan2 branch cut darkening one spoke of a circular dial. */
export function polarTicks(q: Node<'vec2'>, count: number, width: number) {
  const gradient = vec2(q.y.negate(), q.x).div(q.dot(q).max(1e-8))
  const footprint = gradient.dot(q.dFdx()).abs().add(gradient.dot(q.dFdy()).abs()).mul(count / (Math.PI * 2))
  return repeatLine(polarAngle(q).div(Math.PI * 2).mul(count), width, footprint)
}

/** Gaussian pixel integration of a sinusoid; unresolved microstructure approaches its actual mean. */
export function filteredCos(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().pow2().mul(-0.18).exp())
}
