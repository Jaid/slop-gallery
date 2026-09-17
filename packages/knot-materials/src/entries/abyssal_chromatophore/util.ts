import type {Node} from 'three/webgpu'

import {color, float, Fn, Loop, mix, time, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

/** Accumulate complete pigment cells, including the portions crossing into neighboring cells. */
export const pigmentCells = Fn(([position, phase, arousal]: [Node<'vec3'>, Node<'float'>, Node<'float'>]) => {
  const cell = position.floor().toVar()
  const local = position.fract().toVar()
  const footprint = position.fwidth().length().max(0.001).toVar()
  const visibility = footprint.smoothstep(0.35, 1.2).oneMinus().toVar()
  const coverage = float(0).toVar()
  const pigment = vec3(0).toVar()
  Loop(27, ({i}) => {
    const offset = vec3(i.mod(3), i.div(3).mod(3), i.div(9)).sub(1)
    const identity = cell.add(offset).toVar()
    const random = cellNoiseVec3(identity).toVar()
    // Seed from the feature's integer identity, never from a second, shifted sampling grid.
    const secondary = cellNoiseVec3(identity.add(vec3(17.3, 5.9, 41.2))).toVar()
    const center = offset.add(random.mul(0.5).add(0.25))
    const distance = local.sub(center).length()
    const wave = phase.add(secondary.z.mul(1.5)).sin().mul(0.5).add(0.5)
    const radius = arousal.mul(wave.mul(0.5).add(0.5)).mul(0.32).add(0.04).mul(secondary.x.mul(0.5).add(0.75))
    // Before visibility reaches zero, support <= 0.45 + 1.2 * 0.6 = 1.17.
    // Features outside this 3x3x3 neighborhood are at least 1.25 units away.
    const mask = distance.smoothstep(radius.sub(footprint), radius.add(footprint.mul(0.6))).oneMinus().mul(visibility)
    const tint = mix(mix(color('#d8213f'), color('#ff8a1f'), random.y), color('#6b1030'), secondary.y.mul(0.5))
    coverage.addAssign(mask)
    pigment.addAssign(tint.mul(mask))
  })
  // Blend overlapping cells without letting coverage exceed physical material ranges.
  return vec4(pigment.div(coverage.max(0.000001)), coverage.clamp())
})

/** RGB contains colored core/halo emission; alpha contains the photophore surface mask. */
export const photophoreCells = Fn(([position, sweep, intimate]: [Node<'vec3'>, Node<'float'>, Node<'float'>]) => {
  const cell = position.floor().toVar()
  const local = position.fract().toVar()
  // Bound minification support; a 0.35 halo fits within the neighboring-cell search.
  const outer = position.fwidth().length().max(0.001).mul(0.8).add(0.07).min(0.35).toVar()
  const emission = vec3(0).toVar()
  const coverage = float(0).toVar()
  Loop(27, ({i}) => {
    const offset = vec3(i.mod(3), i.div(3).mod(3), i.div(9)).sub(1)
    const identity = cell.add(offset).toVar()
    const random = cellNoiseVec3(identity).toVar()
    const secondary = cellNoiseVec3(identity.add(vec3(7.7, 23.1, 3.3))).toVar()
    const center = offset.add(random.mul(0.6).add(0.2))
    const distance = local.sub(center).length()
    const present = secondary.x.smoothstep(0.55, 0.6)
    const core = distance.smoothstep(0.045, outer).oneMinus().mul(present)
    const twinkle = time.mul(secondary.y.mul(3).add(1)).add(secondary.z.mul(20)).sin().mul(0.5).add(0.5)
    const glowGate = sweep.mul(1.2).add(twinkle.mul(0.25)).add(intimate.mul(0.5))
    const tint = mix(color('#2fe8ff'), color('#b8fff1'), secondary.z)
    const halo = distance.smoothstep(0, 0.35).oneMinus().mul(present)
    emission.addAssign(tint.mul(core.mul(1.8).add(halo.mul(0.35))).mul(glowGate))
    coverage.addAssign(core)
  })
  return vec4(emission, coverage.clamp())
})
