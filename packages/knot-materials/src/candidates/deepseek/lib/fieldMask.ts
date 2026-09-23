import type {Node} from 'three/webgpu'

/**
 * Coverage of the solid region where a field stays inside a band around zero, with a one-pixel
 * transition at its border. Unlike `surfaceLine` this describes areas of growth – frost, lichen,
 * tarnish – rather than thin lines, and it keeps a floor of presence once the pattern has shrunk
 * below a pixel, where the branches themselves can no longer be resolved.
 */
export function fieldMask(field: Node<'float'>, threshold: Node<'float'>, floor = 0.32) {
  const footprint = field.fwidth().max(0.0000001)
  const feather = footprint.mul(0.8)
  const visibility = threshold.div(feather).min(1)
  const coverage = field.abs().sub(threshold).div(feather).smoothstep(0, 1).oneMinus()
  return {
    coverage: coverage.mul(visibility.oneMinus().mul(floor).add(visibility)),
    visibility,
  }
}
