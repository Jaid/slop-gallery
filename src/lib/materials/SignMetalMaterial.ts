import {bumpMap, color, float, mix, mx_noise_float, positionLocal, vec2, vec3} from 'three/tsl'
import {MeshBasicNodeMaterial, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {knotSign} from '../knots/signs.ts'

export function signSupportMaterial(isQuality: boolean) {
  return isQuality ? new SignMetalMaterial : new MeshBasicNodeMaterial({color: '#9ca6ad'})
}

/** Satin stainless steel: fine vertical brushing and a lathe-turned circular foot. */
export default class SignMetalMaterial extends MeshPhysicalNodeMaterial {
  constructor() {
    super({
      metalness: 1,
      roughness: 0.28,
      anisotropy: 0.55,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1.15,
    })
    const grain = mx_noise_float(positionLocal.mul(vec3(180, 3, 180)))
    const foot = positionLocal.y.lessThan(-knotSign.elevation + 0.03)
    const radial = positionLocal.xz.sub(vec2(0, -0.03)).length().mul(2400)
    const brushed = positionLocal.x.add(positionLocal.z).mul(1800).add(grain.mul(3))
    const phase = foot.select(radial, brushed)
    // Subpixel machining lines fade to their average instead of shimmering at a distance.
    const machining = mix(phase.sin().mul(0.5).add(0.5), float(0.5), phase.fwidth().smoothstep(1, 3))
    this.colorNode = mix(color('#89949f'), color('#c5cbd0'), grain.mul(0.12).add(0.65))
    this.roughnessNode = machining.mul(0.08).add(grain.mul(0.025)).add(0.24)
    this.normalNode = bumpMap(machining, float(0.000_12))
  }
}
