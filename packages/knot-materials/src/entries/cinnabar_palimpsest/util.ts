import type {Node} from 'three/webgpu'

import {float, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

export function sealScript(q: Node<'vec3'>, density: number, seed: number) {
  const g = vec2(q.x.mul(12.5).add(q.z.mul(7.4)), q.y.mul(17.5).add(q.z.mul(3.2)))
  const cell = g.floor()
  const f = g.fract().sub(0.5)
  const rnd = cellNoiseVec3(vec3(cell, seed))
  const thick = float(0.048)
  const h1 = f.y
    .sub(rnd.y.mul(0.18).sub(0.16))
    .abs()
    .smoothstep(thick.add(0.022), thick)
    .mul(f.x.abs().smoothstep(0.42, 0.34).oneMinus())
  const h2 = f.y
    .sub(rnd.z.mul(0.2).add(0.12))
    .abs()
    .smoothstep(thick.add(0.018), thick)
    .mul(f.x.abs().smoothstep(0.38, 0.3).oneMinus())
  const v1 = f.x
    .sub(rnd.x.mul(0.28).sub(0.14))
    .abs()
    .smoothstep(thick.add(0.02), thick)
    .mul(f.y.abs().smoothstep(0.44, 0.36).oneMinus())
  const v2 = f.x
    .sub(rnd.y.mul(-0.22).add(0.1))
    .abs()
    .smoothstep(thick.add(0.016), thick)
    .mul(f.y.abs().smoothstep(0.32, 0.24).oneMinus())
  const seal = f.length().sub(rnd.z.mul(0.08).add(0.16)).abs().smoothstep(0.07, 0.028)
  const present = rnd.x.smoothstep(density, density + 0.16)
  return h1.max(h2).max(v1).max(v2).max(seal.mul(rnd.y.smoothstep(0.55, 0.7))).mul(present)
}
