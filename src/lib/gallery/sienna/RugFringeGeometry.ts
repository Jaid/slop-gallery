import {CylinderGeometry} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'

/** Loose wool fringe along the rug’s two short edges, in rug-local coordinates. */
export default function rugFringeGeometry(width: number, depth: number) {
  if (!(width > 0 && depth > 0)) {
    throw new RangeError('A rug fringe needs a positive width and depth.')
  }
  const count = Math.max(1, Math.floor(width / 0.03))
  const parts = [-1, 1].flatMap(side => Array.from({length: count}, (_, index) => {
    const x = (index + 0.5) * width / count - width / 2
    const length = 0.12 + 0.035 * Math.sin(index * 2.73 + side)
    const thread = new CylinderGeometry(0.001, 0.002, length, 4, 1, true)
    thread.rotateX(Math.PI / 2)
    thread.rotateY(0.08 * Math.sin(index * 1.7 + side))
    thread.translate(x, 0, side * (depth / 2 + length / 2 - 0.005))
    return thread
  }))
  return mergeParts(parts)
}
