import type {Node} from 'three/webgpu'

import {color, mix} from 'three/tsl'

export function ember(t: Node<'float'>) {
  const c = t.clamp()
  const low = mix(color('#1a0300'), color('#ff4a00'), c.mul(2).clamp())
  return mix(low, color('#fff0b8'), c.sub(0.5).mul(2).clamp().pow(1.4))
}
