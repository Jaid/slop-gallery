import type {Triple} from './Triple.ts'
import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** A smooth periodic linear-light palette with independent RGB bias, amplitude, frequency and phase. */
export function cosinePalette(t: Node<'float'>, bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
  return vec3(...bias).add(vec3(...amplitude).mul(vec3(...frequency).mul(t).add(vec3(...phase)).mul(Math.PI * 2).cos()))
}
