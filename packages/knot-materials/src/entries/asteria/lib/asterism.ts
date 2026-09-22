import type {Node} from 'three/webgpu'

import {mx_atan2, vec3} from 'three/tsl'

/** Six-rayed asterism centred where the half-vector meets the surface, so it glides as the viewer walks. */
export function asterism(normal: Node<'vec3'>, view: Node<'vec3'>) {
  const N = normal.normalize()
  const L = vec3(-3, 9, -16).normalize()
  const H = view.add(L).normalize()
  const lift = H.sub(N.mul(H.dot(N)))
  const r = lift.length().max(0.0001)
  const axis = vec3(0.44, 0.77, 0.46).normalize()
  const across = N.cross(axis)
  const T = across.div(across.length().max(1e-6))
  const B = N.cross(T)
  const theta = mx_atan2(lift.dot(B), lift.dot(T)) as unknown as Node<'float'>
  const rays = theta.mul(3).cos().abs().pow(24)
  const halo = r.div(0.34).pow2().negate().exp()
  const core = halo.pow(4)
  const gate = N.dot(H).clamp().smoothstep(0.3, 0.7)
  return {
    core: core.mul(gate),
    rays: rays.mul(halo).add(core.mul(2.5)).mul(gate),
    spot: halo.mul(gate),
  }
}
