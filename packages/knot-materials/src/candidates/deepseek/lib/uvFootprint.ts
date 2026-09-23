import {uv} from 'three/tsl'

/**
 * Per-pixel size of one screen pixel measured in UV units, one component per axis. Used to
 * anti-alias lattices laid out in the knot's UV space, such as scales, threads or tiles, where the
 * derivative already carries both the projection and the foreshortening of grazing angles.
 */
export function uvFootprint() {
  const dx = uv().dFdx()
  const dy = uv().dFdy()
  return {
    u: dx.x.abs().max(dy.x.abs()).max(0.0000001),
    v: dx.y.abs().max(dy.y.abs()).max(0.0000001),
  }
}
