import type {Node} from 'three/webgpu'

import {color, Fn, Loop, mix, time, vec3} from 'three/tsl'

import cellNoiseVec3 from '../cellNoise.ts'

/**
 * Soft lattice emitters retain their own tint and phase across cell boundaries.
 * Centers lie in [0.25, 0.75] and support ends at 0.45, so the adjacent 3×3×3
 * cells contain every possible contributor. Sum emitters instead of switching
 * nearest-feature identity, which would introduce new color/shimmer seams.
 */
const interferenceLattice = Fn(([position]: [Node<'vec3'>]) => {
  const cell = position.floor().toVar()
  const local = position.fract().toVar()
  const glow = vec3(0).toVar()
  Loop(27, ({i}) => {
    const offset = vec3(i.mod(3), i.div(3).mod(3), i.div(9)).sub(1)
    const random = cellNoiseVec3(cell.add(offset)).toVar()
    const center = offset.add(random.mul(0.5).add(0.25))
    const dot = local.sub(center).length().smoothstep(0.08, 0.45).oneMinus()
    const shimmer = time.mul(2.5).add(random.x.mul(19)).sin().mul(0.5).add(0.5)
    const tint = mix(color('#9fe8ff'), color('#eaffff'), random.y)
    glow.addAssign(tint.mul(dot).mul(shimmer))
  })
  return glow
})

export default interferenceLattice
