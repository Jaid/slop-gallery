import type {Node} from 'three/webgpu'

import {float, vec2} from 'three/tsl'

import {catPoses} from './cats.ts'

/** Distance to the stars of one pose and to the short meridians that join them. */
export function constellation(local: Node<'vec2'>, variant: number) {
  const chart = catPoses[variant]
  let nearest: Node<'float'> = float(2)
  for (const [x, y] of chart.stars) {
    nearest = nearest.min(local.sub(vec2(x, y)).length())
  }
  let link: Node<'float'> = float(2)
  for (const [a, b] of chart.links) {
    const start = vec2(...chart.stars[a])
    const end = vec2(...chart.stars[b])
    const span = end.sub(start)
    const spanLength = span.length().max(0.0001)
    const along = local.sub(start).dot(span).div(spanLength.mul(spanLength)).clamp(0, 1)
    link = link.min(local.sub(start.add(span.mul(along))).length())
  }
  return {
    link,
    nearest,
  }
}
