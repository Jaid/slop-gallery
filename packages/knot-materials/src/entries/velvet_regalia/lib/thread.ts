import type {Node} from 'three/webgpu'

import {mx_atan2, vec2} from 'three/tsl'

/** A couched gold cord winding across the nap: signed distance to its path plus the couching stitches. */
export function thread(tile: Node<'vec2'>) {
  const wander = tile.x.mul(2.3).sin().mul(0.34).add(tile.x.mul(0.7).cos().mul(0.14))
  const slope = tile.x.mul(2.3).cos().mul(0.78).sub(tile.x.mul(0.7).sin().mul(0.098))
  const cord = tile.y.sub(0.5).add(wander)
  const across = cord.abs().div(0.17)
  const body = across.smoothstep(0.7, 1.05).oneMinus()
  const ply = cord.mul(24).add(tile.x.mul(70)).sin().mul(0.5).add(0.5)
  const twist = mx_atan2(cord.mul(11), tile.x.mul(24).sin().add(0.000001)) as unknown as Node<'float'>
  const stitch = tile.x.mul(20).fract().sub(0.5).abs().div(0.22).smoothstep(0.5, 1).oneMinus()
  return {
    along: vec2(1, slope.mul(0.6)).normalize(),
    body,
    couch: stitch.mul(body),
    dent: stitch.mul(body),
    luster: twist.cos().mul(0.5).add(0.5).mul(0.45).add(ply.mul(0.55)),
  }
}
