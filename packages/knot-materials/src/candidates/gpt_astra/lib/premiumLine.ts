import type {Node} from 'three/webgpu'

export function premiumLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.00001)
  const coverage = field.abs().smoothstep(width, footprint.mul(0.85).add(width)).oneMinus()
  // Fade unresolved lines instead of letting them sparkle at a distance.
  const resolved = footprint.smoothstep(width * 4, width * 16).oneMinus()
  return coverage.mul(resolved)
}
