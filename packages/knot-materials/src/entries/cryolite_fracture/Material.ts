import type {Texture} from 'three/webgpu'

import {cameraPosition, color, modelWorldMatrixInverse, mx_fractal_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec4} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    // Two parallax-offset slices read as cleavage planes suspended inside the ice.
    const inner = p.sub(view.mul(0.15))
    const deep = p.sub(view.mul(0.3))
    const fracture = opticalLine(mx_worley_noise_float(inner.mul(3.4)).sub(0.45), 0.03)
    const deepFracture = opticalLine(mx_worley_noise_float(deep.mul(5)).sub(0.4), 0.025)
    const frost = mx_fractal_noise_float(p.mul(9), 4, 2, 0.5).mul(0.5).add(0.5)
    this.color.set('#eaf6ff')
    this.transmission = 0.96
    this.thickness = 0.8
    this.ior = 1.31
    this.dispersion = 0.25
    this.attenuationColor.set('#6fb7d8')
    this.attenuationDistance = 0.9
    this.roughnessNode = frost.smoothstep(0.55, 0.9).mul(0.22).add(0.02)
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.05
    this.normalNode = proceduralNormal(frost.mul(0.8).add(fracture.mul(0.4)), 0.0012)
    this.emissiveNode = color('#cfeaff').mul(fracture).mul(0.55).add(color('#7fc8ff').mul(deepFracture).mul(near).mul(0.35)).add(color('#ffffff').mul(grazing.pow(4)).mul(0.25))
  }
}
