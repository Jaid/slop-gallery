import {color, mx_noise_float, positionGeometry, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Honed limestone with restrained mineral bedding and fine, non-repeating grain. */
export default class LimestoneMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({roughness: 0.72})
    // Object-space stone continues across the cap, chamfers and carved channels.
    const bedding = mx_noise_float(positionGeometry.mul(vec3(4, 65, 4)))
    const grain = mx_noise_float(positionGeometry.mul(120))
    this.colorNode = color('#d3c8b4').mul(bedding.mul(0.035).add(grain.mul(0.018)).add(1))
    this.roughnessNode = grain.mul(0.045).add(0.72)
  }
}
