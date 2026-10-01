import type {Node, Texture} from 'three/webgpu'

import {color, float, Fn, interleavedGradientNoise, Loop, mix, mx_noise_float, mx_noise_vec3, normalLocal, positionGeometry, refract, screenCoordinate, time, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {starfield} from '../../lib/starfield.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

const steps = 32
/** Young suns buried in the cloud: fixed anchors that drift on slow Lissajous loops. */
const suns = [{
  home: vec3(0.21, 0.06, 0.1),
  rate: 0.31,
  tint: color('#ffd9a0'),
}, {
  home: vec3(-0.27, -0.17, -0.07),
  rate: 0.23,
  tint: color('#9fd8ff'),
}, {
  home: vec3(0.03, 0.34, -0.14),
  rate: 0.37,
  tint: color('#ffb3a0'),
}]
const sunPosition = (index: number) => {
  const sun = suns[index]
  const phase = time.mul(sun.rate).add(index * 2.1)
  return sun.home.add(vec3(phase.sin(), phase.mul(1.3).cos(), phase.mul(0.7).add(1).sin()).mul(0.045))
}
/** Emission gas, absorbing dust and temperature at a point of the nebula. `detail` admits the two finest filament octaves. */
function nebula(x: Node<'vec3'>, detail: Node<'float'>) {
  const t = time.mul(0.022)
  const warp = mx_noise_vec3(x.mul(1.7).add(vec3(t, t.mul(-0.7), 3.3))).mul(0.55)
  const q = x.add(warp)
  const billow = mx_noise_float(q.mul(2.6).add(vec3(0, 0, t))).mul(0.5).add(0.5)
// Ridged multifractal: each octave is a web of thin bright sheets where the noise crosses zero.
  let ridged: Node<'float'> = float(0)
  for (let octave = 0;octave < 4;octave++) {
    const frequency = [3.6, 8.5, 19, 42][octave]
    const n = mx_noise_float(q.mul(frequency).add(vec3(octave * 3.7, 9.1 - octave * 2.3, t.mul(octave % 2 ? 1 : -1))))
    const sheet = float(1).sub(n.abs().mul(5)).max(0).pow(2)
    const weight = [0.5, 0.42, 0.38, 0.34][octave]
    ridged = ridged.add(sheet.mul(octave < 2 ? float(weight) : detail.mul(weight)))
  }
  const gas = billow.mul(0.12).add(ridged).smoothstep(0.5, 1.05).pow(2.2)
  const dust = mx_noise_float(q.mul(2.2).add(vec3(4.4, -1.9, t))).mul(0.5).add(0.5).smoothstep(0.4, 0.78)
  return {
    gas,
    dust,
    heat: ridged.mul(0.72).add(billow.mul(0.12)),
    tint: mx_noise_float(q.mul(1.9).add(vec3(2.2, 8.1, t.negate()))).mul(0.5).add(0.5),
  }
}
/** Hubble-palette emission: violet haze, magenta or teal ionized gas, gold or cyan cores and white-hot filaments. */
function emission(heat: Node<'float'>, tint: Node<'float'>) {
  const side = tint.smoothstep(0.4, 0.6)
  const ion = mix(color('#ff3f9a'), color('#19e6c8'), side)
  const haze = mix(color('#2b17a8'), ion, heat.smoothstep(0.2, 0.55))
  const hot = mix(color('#ffb347'), color('#8ff5ff'), side)
  return mix(mix(haze, hot, heat.smoothstep(0.55, 0.9)), color('#fff6e0'), heat.smoothstep(0.9, 1.2))
}
/** A glass tube filled with an emission nebula, marched for real: the clouds and suns sit at true depths. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.3)
    this.name = knotData.id
    const {view, facing, grazing, near, intimate} = viewerFrame()
    const volume = Fn(() => {
      const enter = view.negate()
      const direction = refract(enter, normalLocal.normalize(), float(1 / 1.45)).normalize()
      const origin = positionGeometry
      const length = facing.mul(0.6).add(0.4).mul(0.6)
      const step = length.div(steps)
      const jitter = interleavedGradientNoise(screenCoordinate)
      const detail = near.mul(0.85).add(0.15)
      const transmittance = float(1).toVar()
      const glow = vec3(0).toVar()
      Loop({
        start: 0,
        end: steps,
        type: 'int',
      }, ({i}) => {
        const x = origin.add(direction.mul(float(i).add(jitter).mul(step)))
        const field = nebula(x, detail)
        let light: Node<'float'> = float(0.3)
        for (let index = 0;index < suns.length;index++) {
          light = light.add(float(0.011).div(x.sub(sunPosition(index)).lengthSq().add(0.012)))
        }
        const body = emission(field.heat.mul(light.mul(0.55).add(0.5).min(1.6)).min(1), field.tint)
        glow.addAssign(body.mul(field.gas).mul(light).mul(transmittance).mul(step).mul(70))
        glow.addAssign(color('#4a1f10').mul(field.dust).mul(light).mul(transmittance).mul(step).mul(2.2))
        transmittance.mulAssign(field.dust.mul(2.6).add(field.gas.mul(0.75)).mul(step).mul(-12).exp())
      })
// Suns themselves: a halo and a hard core wherever the ray passes close, dimmed by whatever lies in front.
      let flares: Node<'vec3'> = vec3(0)
      for (const [index, sun] of suns.entries()) {
        const toSun = sunPosition(index).sub(origin)
        const closest = toSun.dot(direction).clamp(0, length)
        const miss = toSun.sub(direction.mul(closest)).length()
        const halo = float(0.0009).div(miss.pow2().add(0.0009))
        const core = miss.smoothstep(0.004, 0.02).oneMinus()
        flares = flares.add(sun.tint.mul(halo.mul(0.55).add(core.mul(2.4))))
      }
      const far = starfield(direction, 34, 0.9).add(starfield(direction.add(7.3), 88, 0.95).mul(intimate.mul(0.7).add(0.3)))
      const deep = mix(color('#030108'), color('#170a3a'), mx_noise_float(direction.mul(2.1)).mul(0.5).add(0.5))
      return glow.add(flares.mul(transmittance.sqrt())).add(far.mul(2.4).add(deep).mul(transmittance))
    })
    const glass = facing.pow(0.3).mul(0.85).add(0.15)
    this.colorNode = color('#010104')
    this.metalness = 0
    this.roughness = 0.04
    this.ior = 1.5
    this.clearcoat = 1
    this.clearcoatRoughness = 0.015
    this.emissiveNode = volume().mul(glass).mul(near.mul(0.35).add(0.85))
      .add(color('#3a2cc0').mul(grazing.pow(4)).mul(0.25))
  }
}
