import type {Node} from 'three/webgpu'

import {attribute, bumpMap, color, exp, float, mix, mx_noise_float, normalLocal, positionGeometry, time, uv, vec3} from 'three/tsl'
import {DoubleSide, MeshPhysicalNodeMaterial} from 'three/webgpu'

/**
 * Fountain water, either the still pools or the falling veils and jet.
 *
 * Pools ripple outward from the ring where their veil lands (`splashRadius`). Falling water is a thin sheet whose streaks travel at the water’s own speed – its UV v is the age of the water in seconds – and which tears into strands and turns white with air as it falls (`waterFall`, 0 at the lip and 1 at the pool).
 */
export default class FountainWaterMaterial extends MeshPhysicalNodeMaterial {
  constructor(falling = false, heavy = true) {
    super({
      color: '#ffffff',
      metalness: 0,
      roughness: falling ? 0.04 : 0.05,
      ior: 1.333,
      transmission: heavy ? (falling ? 0.7 : 0.35) : 0,
      thickness: falling ? 0.01 : 0.26,
      attenuationColor: '#3f9184',
      attenuationDistance: 0.9,
      transparent: falling,
      depthWrite: !falling,
      side: DoubleSide,
      envMapIntensity: heavy ? 1.3 : 0.7,
      clearcoat: falling ? 0 : 0.6,
      clearcoatRoughness: 0.05,
    })
    if (falling) {
      const fall = attribute<'float'>('waterFall', 'float')
      const air = attribute<'float'>('waterAir', 'float')
      // Azimuth from the geometry itself, so streaks run continuously across the lathe’s UV seam.
      const around = positionGeometry.xz.normalize()
      const emitted = time.sub(uv().y)
      const octaves = (scale: number, speed: number, offset: Node<'float'>) => mx_noise_float(vec3(around.mul(scale), emitted.mul(speed).add(offset))).mul(0.65)
        .add(mx_noise_float(vec3(around.mul(scale * 2.7).add(7.3), emitted.mul(speed * 1.9).add(offset))).mul(0.35))
        .mul(0.5).add(0.5)
      const streaks = octaves(23, 3, float(0))
      const tears = octaves(13, 5, fall.mul(2))
      // The sheet is whole at the lip and frays into strands toward the pool.
      const threshold = fall.pow(1.5).mul(0.85).sub(0.08)
      const coverage = tears.smoothstep(threshold, threshold.add(0.12))
      const foam = air.add(streaks.sub(0.5).mul(0.5)).clamp()
      // Slow, broad wobble so the curtain never reads as a rigid shell.
      const wobble = mx_noise_float(vec3(around.mul(4), emitted.mul(1.3)))
      this.colorNode = mix(color('#c4e3dc'), color('#fbfffd'), foam)
      this.opacityNode = coverage.mul(mix(float(heavy ? 0.3 : 0.45), float(0.9), foam)).mul(streaks.mul(0.6).add(0.55)).clamp()
      this.normalNode = bumpMap(streaks.mul(0.6).add(tears.mul(0.4)).add(wobble), float(0.006))
      this.positionNode = positionGeometry.add(normalLocal.mul(streaks.sub(0.5).mul(0.004).add(wobble.mul(fall).mul(0.012))))
      this.roughnessNode = foam.mul(0.3).add(0.04)
    } else {
      const p = positionGeometry.xz
      const r = p.length()
      const fromSplash = r.sub(attribute<'float'>('splashRadius', 'float')).abs()
      const rings = fromSplash.mul(45).sub(time.mul(6)).sin().mul(exp(fromSplash.mul(-4.5))).mul(0.005)
      const swell = p.x.mul(9).add(p.y.mul(5)).sub(time.mul(1.7)).sin().mul(0.0022)
        .add(p.x.mul(-6).add(p.y.mul(11)).sub(time.mul(2.3)).sin().mul(0.0016))
      const grain = mx_noise_float(vec3(p.mul(9), time.mul(0.6)))
      const height = rings.add(swell).add(grain.mul(0.0006))
      const foam = exp(fromSplash.mul(-28)).mul(grain.mul(0.5).add(0.5).smoothstep(0.2, 0.75)).mul(0.7)
      // Ring crests catch a little light even where the reflected room is uniform.
      const crest = rings.div(0.005).mul(0.5).add(0.5).mul(exp(fromSplash.mul(-4.5))).mul(0.18)
      this.colorNode = mix(color(heavy ? '#7fbcb1' : '#4d958b'), color('#f3fbf8'), foam.add(crest).clamp())
      this.normalNode = bumpMap(height, float(1))
      this.positionNode = positionGeometry.add(normalLocal.mul(height))
      this.roughnessNode = foam.mul(0.25).add(0.05)
    }
  }
}
