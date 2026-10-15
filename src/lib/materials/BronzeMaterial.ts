import {color, mix, mx_noise_float, positionGeometry} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Hand-rubbed architectural bronze: warm satin metal with soft, darker patina in places the hand never polishes. */
export default class BronzeMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      metalness: 1,
      roughness: 0.34,
    })
    const patina = mx_noise_float(positionGeometry.mul(7)).mul(0.5).add(0.5).smoothstep(0.35, 0.8)
    const grain = mx_noise_float(positionGeometry.mul(90)).mul(0.5).add(0.5)
    this.colorNode = mix(color('#c9a46a'), color('#86643a'), patina.mul(0.7)).mul(grain.mul(0.08).add(0.96))
    this.roughnessNode = patina.mul(0.16).add(grain.mul(0.05)).add(0.26)
  }
}
