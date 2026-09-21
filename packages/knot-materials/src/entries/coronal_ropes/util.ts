import type {Node} from 'three/webgpu'

import {
  Fn,
  mix,
  mx_noise_float,
  time,
  vec3,
} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'

/**
 * Subtle convective bubbling of the solar envelope.
 * Keeps the stellar limb smooth while simulating boiling acoustic waves.
 */
export const solarEnvelopeDisplacement = Fn(([tube]: [Node<'vec2'>]) => {
  const {position: p, normal} = knotFrame(tube)
  const t = time.mul(0.12)
  const acousticWaves = mx_noise_float(p.mul(14).add(vec3(t, t.mul(0.4), t.mul(-0.6))))
    .mul(0.008)
  return p.add(normal.mul(acousticWaves))
})

/**
 * Analytical Planckian blackbody radiation calibrated for ACES filmic tonemapping.
 * Preserves chromatic solar hues (deep umbra, fiery orange lanes, rich gold granules).
 */
export function solarBlackbody(temperatureK: Node<'float'>) {
  const t = temperatureK.sub(3000).div(5000).clamp()
  const coolUmbra = vec3(0.08, 0.01, 0.003) // 3000 K deep dark umbra
  const warmPenumbra = vec3(0.55, 0.12, 0.01) // 4500 K penumbra
  const intergranular = vec3(0.9, 0.32, 0.02) // 5200 K fiery orange lane
  const granuleCore = vec3(1, 0.64, 0.08) // 6200 K rich solar gold
  const faculaHot = vec3(1.1, 0.96, 0.72) // 7800 K radiant white-gold
  return mix(
    coolUmbra,
    mix(
      warmPenumbra,
      mix(
        intergranular,
        mix(granuleCore, faculaHot, t.smoothstep(0.64, 1)),
        t.smoothstep(0.44, 0.64),
      ),
      t.smoothstep(0.25, 0.44),
    ),
    t.smoothstep(0, 0.25),
  )
}
