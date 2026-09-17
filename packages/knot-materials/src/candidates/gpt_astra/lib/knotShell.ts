import type {Node} from 'three/webgpu'

import {Fn} from 'three/tsl'

import {knotFrame} from '../../../lib/knotFrame.ts'

export const knotShell = Fn(([tube, inset]: [Node<'vec2'>, Node<'float'>]) => {
  const {center, normal} = knotFrame(tube)
  return center.add(normal.mul(inset.add(0.13)))
})
