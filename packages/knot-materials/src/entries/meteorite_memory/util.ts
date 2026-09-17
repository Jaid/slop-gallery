import type {Node} from 'three/webgpu'

export function premiumHash(seed: Node<'float'>) {
  return seed.mul(127.1).add(311.7).sin().mul(43_758.5453).fract()
}
