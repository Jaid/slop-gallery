import {color, mix, mx_noise_float, positionGeometry} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal} from './filters.ts'

/** Blackened, hand-forged iron: dark satin metal with a faint rusty bloom and hammer dimples. */
export default class WroughtIronMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      metalness: 0.75,
      roughness: 0.5,
      envMapIntensity: 0.6,
    })
    const bloom = mx_noise_float(positionGeometry.mul(6)).mul(0.5).add(0.5).smoothstep(0.55, 0.95)
    const hammer = mx_noise_float(positionGeometry.mul(120))
    this.colorNode = mix(color('#24211f'), color('#4a2d1c'), bloom.mul(0.5))
    this.roughnessNode = bloom.mul(0.25).add(hammer.mul(0.04)).add(0.45)
    this.normalNode = heightNormal(hammer.mul(0.0004))
  }
}
