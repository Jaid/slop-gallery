import type {Node} from 'three/webgpu'

/** A pixel-filtered zero crossing without the distant-detail suppression of opticalLine. */
export function hairline(field: Node<'float'>, width: Node<'float'> | number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus()
}
