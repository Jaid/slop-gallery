import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/**
 * Multi-wavelength thin-film optical interference in linear RGB light.
 * Computes the optical path difference 2 * n * d * cos(theta_t) across
 * primary RGB wavelengths (650 nm, 530 nm, 440 nm).
 */
export function thinFilm(thicknessNm: Node<'float'>, cosTheta: Node<'float'>, filmIor = 1.38) {
  const sin2 = float(1).sub(cosTheta.mul(cosTheta)).max(0)
  const cosT = float(1).sub(sin2.div(filmIor * filmIor)).max(0.01).sqrt()
  const opd = thicknessNm.mul(2 * filmIor).mul(cosT)
  const phaseR = opd.div(650).mul(Math.PI * 2)
  const phaseG = opd.div(530).mul(Math.PI * 2)
  const phaseB = opd.div(440).mul(Math.PI * 2)
  const r = phaseR.cos().mul(0.5).add(0.5)
  const g = phaseG.cos().mul(0.5).add(0.5)
  const b = phaseB.cos().mul(0.5).add(0.5)
  return vec3(r, g, b)
}
