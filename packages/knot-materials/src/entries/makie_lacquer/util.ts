import type {Node} from 'three/webgpu'

import {color, float, Fn, Loop, mix, normalViewGeometry, struct, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {glints} from '../../lib/glints.ts'

const flakeField = struct({
  tint: 'vec3',
  sparkle: 'vec3',
  coverage: 'float',
})
/** Complete gold flakes with stable centers, tints and tilts, including neighboring-cell overlap. */
const evaluateFlakes = Fn(([position, threshold]: [Node<'vec3'>, Node<'float'>]) => {
  const cell = position.floor().toVar()
  const local = position.fract().toVar()
  const footprint = position.fwidth().length().max(0.001).toVar()
  const visibility = footprint.smoothstep(0.4, 1.6).oneMinus().toVar()
  // Centers occupy [0.3, 0.7]. Unsearched cells are at least 1.3 units away.
  // Only cap the broad minification filter, not the original 0.24 core or 0.3 radius.
  const outer = footprint.mul(0.8).add(0.3).min(1.3).toVar()
  const coverage = float(0).toVar()
  const tintSum = vec3(0).toVar()
  const sparkle = vec3(0).toVar()
  Loop(27, ({i}) => {
    const offset = vec3(i.mod(3), i.div(3).mod(3), i.div(9)).sub(1)
    const identity = cell.add(offset).toVar()
    const random = cellNoiseVec3(identity).toVar()
    const secondary = cellNoiseVec3(identity.add(vec3(37.1, 11.3, 59.7))).toVar()
    const present = random.x.smoothstep(threshold, threshold.add(0.04))
    const center = offset.add(secondary.mul(0.4).add(0.3))
    const distance = local.sub(center).length()
    const shape = distance.smoothstep(0.24, outer).oneMinus()
    const mask = present.mul(shape).mul(visibility)
    const normal = normalViewGeometry.add(secondary.mul(2).sub(1).mul(0.45)).normalize()
    const tint = mix(color('#f5c451'), color('#ffe9a8'), random.y)
    coverage.addAssign(mask)
    tintSum.addAssign(tint.mul(mask))
    sparkle.addAssign(tint.mul(glints(normal, 90)).mul(mask))
  })
  return flakeField(tintSum.div(coverage.max(0.000001)), sparkle, coverage.clamp())
})

export function goldFlakes(position: Node<'vec3'>, threshold: Node<'float'>) {
  // Three's struct declarations do not yet expose TSL extensions or member types.
  const field = (evaluateFlakes(position, threshold) as unknown as Node<'struct'>).toVar()
  return {
    coverage: field.get('coverage') as Node<'float'>,
    tint: field.get('tint') as Node<'vec3'>,
    sparkle: field.get('sparkle') as Node<'vec3'>,
  }
}
