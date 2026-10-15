import type {Node} from 'three/webgpu'

import {float, mx_cell_noise_float, positionViewDirection, transformNormalToView, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

/** Fixed camera-relative lamps, so glitter reads under any gallery lighting. */
const lamps = [vec3(0.35, 0.78, 0.52).normalize(), vec3(-0.62, 0.28, 0.73).normalize(), vec3(0.1, -0.35, 0.93).normalize(), vec3(0.75, -0.1, 0.65).normalize()]
/**
 * Object-anchored mirror flakes: each lattice cell may hold one tiny facet with its own tilt, which flashes only when it bisects the eye and a lamp.
 * Walking past makes individual flakes ignite and die out. `density` is the fraction of populated cells, `spread` the facet tilt, `sharpness` the flash width.
 * Unresolved flakes keep their flash but shrink their energy to the covered fraction, which suppresses shimmer without losing the sparkle.
 */
export function glitter(position: Node<'vec3'>, normalObject: Node<'vec3'>, {density = 0.35, spread = 0.6, sharpness = 900, seed = 0}: {
  density?: number
  seed?: number
  sharpness?: number
  spread?: number
} = {}) {
  const cell = position.floor()
  const random = cellNoiseVec3(cell.add(seed))
  const gate = mx_cell_noise_float(cell.add(seed + 17.3)).lessThan(density).select(float(1), float(0))
  const center = random.mul(0.6).add(0.2)
  const distance = position.fract().sub(center).length()
  const footprint = position.fwidth().length().max(0.0005)
  const radius = footprint.mul(0.75).max(0.09)
  const dot = distance.div(radius).smoothstep(0, 1).oneMinus()
  const coverage = float(0.09).div(radius).pow2()
  const tilt = cellNoiseVec3(cell.add(seed + 41.9)).sub(0.5).mul(spread * 2)
  const facet = transformNormalToView(normalObject.add(tilt).normalize()).normalize()
  let flash: Node<'float'> = float(0)
  for (const lamp of lamps) {
    flash = flash.add(facet.dot(lamp.add(positionViewDirection).normalize()).clamp().pow(sharpness))
  }
  return {
    flash: flash.mul(dot).mul(gate).mul(coverage),
    random,
  }
}
