import type {Texture} from 'three/webgpu'

import {cameraPosition, color, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {liquidNormal, opticalLine} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class SuperfluidVortexMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const deep = p.sub(view.mul(0.28))
    const vortexAxis = vec3(p.x, 0, p.z).normalize()
    const rotation = p.y.mul(12).add(time.mul(1.5))
    const vortexLines = opticalLine(p.dot(vortexAxis).add(rotation).sin(), 0.03)
    const innerFilaments = opticalLine(mx_noise_float(deep.mul(25).sub(time.mul(0.4))), 0.02)
    this.colorNode = color('#021a1a')
    this.transmission = 0.92
    this.thickness = 0.6
    this.ior = 1.25
    this.dispersion = 0.3
    this.attenuationColor.set('#004d40')
    this.attenuationDistance = 0.5
    this.roughness = 0.01
    this.clearcoat = 1
    this.clearcoatRoughness = 0.01
    this.normalNode = liquidNormal(near, 0.22)
    this.emissiveNode = color('#00ffcc').mul(vortexLines).mul(near.mul(0.8).add(0.2)).add(color('#80ffea').mul(innerFilaments).mul(near).mul(0.7)).add(color('#00bfa5').mul(rim).mul(0.2))
  }
}
