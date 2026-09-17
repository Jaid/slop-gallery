import type {Node} from 'three/webgpu'

/** Filter a signed field before thresholding, then suppress unresolved detail. */
export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}
