import type {Node} from 'three/webgpu'

export function filament(field: Node<'float'>, width: number, softness = 1.3) {
  const footprint = field.fwidth().max(0.0001)
  const core = field.abs()
    .smoothstep(width, footprint.mul(softness).add(width))
    .oneMinus()
  const survival = footprint
    .smoothstep(width * 4, width * 20)
    .oneMinus()
  return core.mul(survival)
}
