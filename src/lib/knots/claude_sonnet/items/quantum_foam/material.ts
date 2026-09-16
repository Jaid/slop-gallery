import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class QuantumFoamMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const flicker = time.mul(3)
    const foamNear = mx_noise_float(inner.mul(26).add(vec3(flicker, flicker.mul(-1.3), flicker.mul(0.7))))
    const foamFar = mx_noise_float(deep.mul(34).add(vec3(flicker.mul(-0.6), flicker.mul(0.9), flicker.mul(-1.1))))
    const sparkleNear = foamNear.smoothstep(0.55, 0.72)
    const sparkleFar = foamFar.smoothstep(0.6, 0.76)
    const haze = mx_noise_float(p.mul(4)).mul(0.5).add(0.5)
    this.colorNode = mix(color('#04070c'), color('#131b2b'), haze)
    this.transmission = 0.62
    this.thickness = 0.35
    this.ior = 1.28
    this.attenuationColor.set('#0f2440')
    this.attenuationDistance = 1
    this.roughness = 0.05
    this.clearcoat = 0.75
    this.clearcoatRoughness = 0.03
    this.iridescence = 0.5
    this.iridescenceIOR = 1.25
    this.iridescenceThicknessNode = haze.mul(120).add(200)
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(30).add(vec3(0, 0, flicker))), 0.0018)
    this.emissiveNode = color('#bdfcff').mul(sparkleNear).mul(near.mul(0.8).add(0.3)).add(color('#8f7dff').mul(sparkleFar).mul(near).mul(0.5)).add(color('#dff7ff').mul(rim).mul(0.14))
  }
}
