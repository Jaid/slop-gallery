import type {Node} from 'three/webgpu'

import {color, mix} from 'three/tsl'

export function blackbody(t: Node<'float'>) {
  const coal = mix(color('#140805'), color('#c21400'), t.pow(0.85))
  const flame = mix(color('#ff6a12'), color('#fff3d6'), t)
  return mix(coal, flame, t)
}
