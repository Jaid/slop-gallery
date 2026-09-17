import type {Node} from 'three/webgpu'

import {visibility} from './visibility.ts'

export function filteredWave(phase: Node<'float'>) {
  return phase.cos().mul(visibility(phase.fwidth(), 0.6, 3.2))
}
