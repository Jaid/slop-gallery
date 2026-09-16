import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_noise_vec3, positionGeometry, positionView, time, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class NebulaGlassMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const clouds = mx_noise_vec3(inner.mul(3).add(time.mul(0.05)))
    const density = clouds.x.mul(0.5).add(0.5).smoothstep(0.3, 0.8)
    const stars = mx_noise_float(deep.mul(100)).pow(16).mul(near.mul(2).add(0.5))
    const nebulaColor = mix(color('#220044'), mix(color('#ff00aa'), color('#00ffff'), clouds.y), density)
    this.colorNode = color('#02000a')
    this.transmission = 0.92
    this.thickness = 0.6
    this.ior = 1.2
    this.roughness = 0.02
    this.attenuationColor.set('#440088')
    this.attenuationDistance = 1.2
    this.emissiveNode = nebulaColor.mul(density).mul(0.6).add(color('#ffffff').mul(stars).mul(5))
  }
}
