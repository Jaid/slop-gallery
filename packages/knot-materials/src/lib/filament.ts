import type {Node} from 'three/webgpu'

/** A derivative-filtered zero crossing, retaining a luminous core at small widths. */
export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
}
