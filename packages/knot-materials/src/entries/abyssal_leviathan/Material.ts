import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, sin, time, vec3} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, facing, rim, intimate} = viewerFrame()
    const scalePos = p.mul(12).add(vec3(0, time.mul(0.1), 0))
    // Fractal octaves can exceed [-1, 1]; bound the mask before pow and material inputs.
    const scales = mx_fractal_noise_float(scalePos, 3, 2, 0.5).mul(0.5).add(0.5).clamp().pow(3)
    const scaleNormal = proceduralNormal(scales, 0.05)
    const iridescence = mix(color('#0a1128'), color('#1c7299'), facing.mul(scales))
    const deepGlow = mix(color('#00ffcc'), color('#ff00aa'), sin(time.mul(0.5).add(p.y.mul(3))).mul(0.5).add(0.5))
    const pulse = sin(time.mul(2).add(p.dot(vec3(1, 2, 3)).mul(5))).mul(0.5).add(0.5)
    const bioLuminescence = deepGlow.mul(pulse).mul(intimate.mul(0.8).add(0.2)).mul(scales.oneMinus())
    this.colorNode = mix(iridescence, color('#02040a'), scales)
    this.metalness = 0.4
    this.roughnessNode = scales.mul(0.3).add(0.2)
    this.normalNode = scaleNormal
    this.anisotropyNode = scales
    this.clearcoat = 0.5
    this.clearcoatRoughness = 0.1
    this.emissiveNode = bioLuminescence.mul(2.5).add(rim.mul(color('#0055ff')).mul(0.3))
    this.sheen = 1
    this.sheenRoughness = 0.4
    this.sheenNode = color('#00aaff')
  }
}
