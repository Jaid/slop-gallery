import type {Node} from 'three/webgpu'

export {liquidNormal} from '../materials/liquidNormal.ts'
export {opticalBands, opticalLine, spectralColor} from '../materials/opticalField.ts'
export {proceduralNormal} from '../materials/proceduralNormal.ts'

// Shared verbatim by all nine submissions.
export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
}
