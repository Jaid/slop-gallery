import type {Node} from 'three/webgpu'

import {time} from 'three/tsl'

export function heartbeat(rate: number): Node<'float'> {
  const phase = time.mul(rate).fract()
  const spike = (at: number, sharpness: number) => phase.sub(at).abs().mul(sharpness).oneMinus().clamp().pow(3)
  return spike(0.06, 9).add(spike(0.32, 12).mul(0.6)).clamp()
}
