import type {Node} from 'three/webgpu'

/**
 * Filter a periodic signal to its mean before it becomes subpixel. Phase is in radians.
 */
export function wave(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().smoothstep(0.7, 3.1).oneMinus())
}

export function disk(radius: Node<'float'>, size: number, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return radius.smoothstep(aa.negate().add(size), aa.add(size)).oneMinus()
}

/**
 * Smooth detail reveal is uniform over an exhibit, avoiding a camera-centered spot on the surface.
 */
export function approach(distance: Node<'float'>) {
  return distance.smoothstep(1.25, 5.8).oneMinus()
}
