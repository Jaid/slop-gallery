import type {Node} from 'three/webgpu'

import {max, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/**
 * A narrow, saturated slice of the visible spectrum on a repeating hue wheel. Peaks are normalized
 * so a domain keeps its energy while its hue slides with the viewing angle.
 */
export function spectralBand(hue: Node<'float'>, sharpness = 1.35) {
  const phase = hue.mul(TAU)
  const lobes = max(vec3(phase, phase.sub(2.0944), phase.sub(4.1888)).cos(), vec3(0)).pow(sharpness)
  return lobes.div(max(lobes.x, max(lobes.y, lobes.z)).max(0.001))
}
