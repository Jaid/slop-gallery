import type {Node} from 'three/webgpu'

import {attribute, color, exp, float, mix, mx_noise_float, normalLocal, positionGeometry, time, uv, vec3} from 'three/tsl'
import {DoubleSide, MeshPhysicalNodeMaterial} from 'three/webgpu'

import FountainEnvironment from '../gallery/fountain/FountainEnvironment.ts'
import {heightNormal, visibleDetail} from './filters.ts'

/** Borrowed page-lifetime radiance, not another scene render. Gives the water broad window-like reflections even in fast mode. */
export const fountainWaterEnvironment = new FountainEnvironment

/** Dielectric water with surface-gradient ripple normals, local impact foam and gravity-timed flow along the spill ribbons. */
export default class FountainWaterMaterial extends MeshPhysicalNodeMaterial {
  constructor(falling = false, heavy = true) {
    super({
      color: '#ffffff',
      metalness: 0,
      roughness: falling ? 0.1 : 0.085,
      ior: 1.333,
      transmission: heavy ? (falling ? 0.5 : 0.9) : 0,
      thickness: falling ? 0.012 : 0.3,
      attenuationColor: '#8dc9ba',
      attenuationDistance: 1.2,
      transparent: falling,
      depthWrite: !falling,
      side: DoubleSide,
      forceSinglePass: true,
      envMap: fountainWaterEnvironment,
      envMapIntensity: 0.85,
    })
    this.name = `${falling ? 'Fountain spill water' : 'Fountain pool water'} (${heavy ? 'heavy' : 'fast'})`
    if (falling) {
      const fall = attribute<'float'>('waterFall', 'float')
      const air = attribute<'float'>('waterAir', 'float')
      const around = positionGeometry.xz.normalize()
      const emitted = time.sub(uv().y)
      const octaves = (scale: number, speed: number, offset: Node<'float'>) => mx_noise_float(vec3(around.mul(scale), emitted.mul(speed).add(offset))).mul(0.65)
        .add(mx_noise_float(vec3(around.mul(scale * 2.7).add(7.3), emitted.mul(speed * 1.9).add(offset))).mul(0.35))
        .mul(0.5).add(0.5)
      const streaks = octaves(23, 3, float(0)).toVar('spillStreaks')
      const tears = octaves(13, 5, fall.mul(2)).toVar('spillTears')
      const coverage = tears.smoothstep(fall.pow(2).mul(0.6).sub(0.16), fall.pow(2).mul(0.6).add(0.02))
      const foam = air.mul(streaks.smoothstep(0.45, 0.8))
      const wobble = mx_noise_float(vec3(around.mul(4), emitted.mul(1.3)))
      this.colorNode = mix(color(heavy ? '#e0f2ed' : '#a2cdc2'), color('#f1faf7'), foam)
      this.opacityNode = coverage.mul(streaks.mul(0.25).add(0.7)).add(foam.mul(0.15)).clamp()
      // Unlike bumpMap, the surface-gradient helper differentiates arbitrary procedural heights.
      this.normalNode = heightNormal(streaks.mul(0.0007).add(tears.mul(0.0004)))
      this.positionNode = positionGeometry.add(normalLocal.mul(wobble.mul(fall).mul(0.004)))
      this.roughnessNode = foam.mul(0.22).add(0.085)
      if (heavy) {
        this.transmissionNode = float(0.5).mul(foam.mul(0.9).oneMinus())
      }
    } else {
      const p = positionGeometry.xz
      const r = p.length()
      const splash = attribute<'float'>('splashRadius', 'float')
      const streams = attribute<'float'>('splashStreams', 'float')
      const angle = p.y.atan(p.x.add(0.00001))
      // Distance to the nearest landing, not a uniform ring of foam. The top cup has a central impact.
      const sideways = angle.mul(streams).mul(0.5).sin().mul(splash).mul(2).div(streams.max(1))
      const fromSplash = r.sub(splash).pow(2).add(sideways.pow(2)).add(0.000001).sqrt()
      const footprint = p.fwidth().length()
      const rings = fromSplash.mul(52).sub(time.mul(7)).sin().mul(exp(fromSplash.mul(-4))).mul(0.005).mul(visibleDetail(footprint, 0.12))
      const swell = p.x.mul(9).add(p.y.mul(5)).sub(time.mul(1.7)).sin().mul(0.005)
        .add(p.x.mul(-6).add(p.y.mul(11)).sub(time.mul(2.3)).sin().mul(0.003))
      const grain = mx_noise_float(vec3(p.mul(16), time.mul(0.8))).mul(visibleDetail(footprint, 0.06))
      const height = rings.add(swell).add(grain.mul(0.00035)).toVar('poolRippleHeight')
      const foam = exp(fromSplash.mul(-32)).mul(grain.mul(0.5).add(0.5).smoothstep(0.2, 0.75)).mul(0.85)
      this.colorNode = mix(color(heavy ? '#e1f2ec' : '#397e76'), color('#e5f3ed'), foam)
      this.normalNode = heightNormal(height)
      this.positionNode = positionGeometry.add(normalLocal.mul(swell))
      this.roughnessNode = foam.mul(0.2).add(0.085)
      if (heavy) {
        this.transmissionNode = float(0.9).mul(foam.mul(0.95).oneMinus())
      }
    }
  }
}
