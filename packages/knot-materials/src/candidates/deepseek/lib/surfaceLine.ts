import type {Node} from 'three/webgpu'

/**
 * Anti-aliased rendering of a thin surface feature described by a field that is zero on its center
 * line and grows outward, such as the distance to a crack, a scale edge or a thread gap.
 *
 * `coverage` is the feature's opacity profile with roughly one pixel of feathering, `core` a narrower
 * profile for hot center lines, `energy` how much of the feature still fits inside a pixel – multiply
 * it in so features dim instead of turning into aliasing dots – and `relief` the matching depth
 * multiplier for bump mapping.
 */
export function surfaceLine(field: Node<'float'>, halfWidth: Node<'float'>, footprint: Node<'float'> = field.fwidth()) {
  const energy = halfWidth.mul(2).div(footprint).min(1)
  return {
    coverage: field.smoothstep(0, halfWidth.add(footprint.mul(0.6))).oneMinus(),
    core: field.smoothstep(0, halfWidth.mul(0.45).add(footprint.mul(0.35))).oneMinus(),
    energy,
    footprint,
    relief: energy,
  }
}
