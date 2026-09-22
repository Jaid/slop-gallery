import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionViewDirection} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    // Glaze pooling (fractal) plus a crazing network (worley cell walls) sunk into the surface.
    const glaze = mx_fractal_noise_float(p.mul(2.4), 4, 2, 0.5).mul(0.5).add(0.5)
    const cracks = opticalLine(mx_worley_noise_float(p.mul(7.5)).sub(0.34), 0.012)
    const copper = glaze.smoothstep(0.55, 0.78)
    const base = mix(color('#0d1417'), color('#0f6b6a'), glaze.smoothstep(0.2, 0.6))
    const lustred = mix(base, color('#b2521f'), copper)
    this.colorNode = mix(lustred, color('#1a1013'), cracks)
    this.metalnessNode = copper.mul(0.55)
    this.roughnessNode = cracks.mul(0.5).add(0.08).add(glaze.mul(0.06))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.04
    this.normalNode = proceduralNormal(cracks.mul(-0.6).add(glaze.mul(0.2)), 0.0018)
    this.iridescence = 0.35
    this.iridescenceIOR = 1.6
    this.iridescenceThicknessNode = glaze.mul(300).add(220)
    this.emissiveNode = color('#ffd9a0').mul(copper).mul(grazing.pow(3)).mul(0.2)
  }
}
