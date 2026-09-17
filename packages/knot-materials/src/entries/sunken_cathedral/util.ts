import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

import {premiumLine} from '../../candidates/gpt_astra/lib/premiumLine.ts'

export /** Repeating arched architecture, evaluated at arbitrary interior positions. */
function cathedralTracery(q: Node<'vec3'>) {
  const x = q.x.mul(9).fract().sub(0.5)
  const y = q.y.mul(7).fract()
  const upper = y.smoothstep(0.43, 0.48)
  const archDistance = vec2(x, y.sub(0.46)).length().sub(0.37)
  const arch = premiumLine(archDistance, 0.014).mul(upper)
  const jambs = premiumLine(x.abs().sub(0.37), 0.012).mul(upper.oneMinus()).mul(y.smoothstep(0.08, 0.13))
  const sill = premiumLine(y.sub(0.11), 0.013).mul(x.abs().smoothstep(0.37, 0.42).oneMinus())
  const mullion = premiumLine(x, 0.009).mul(y.smoothstep(0.1, 0.16)).mul(y.smoothstep(0.72, 0.83).oneMinus())
  const roseWindow = premiumLine(vec2(x, y.sub(0.63)).length().sub(0.085), 0.01)
  const crossbar = premiumLine(y.sub(0.46), 0.009).mul(x.abs().smoothstep(0.34, 0.39).oneMinus())
  return arch.add(jambs).add(sill).add(mullion.mul(0.65)).add(roseWindow).add(crossbar.mul(0.6)).clamp()
}
