import type {Node} from 'three/webgpu'

/** A soft band of the given half-width around `centre`; 1 on the zero set itself, 0 beyond the half-width. */
export function ridgeBand(value: Node<'float'>, centre: number, halfWidth: number) {
  return value.sub(centre).abs().div(halfWidth).oneMinus().clamp(0, 1)
}
