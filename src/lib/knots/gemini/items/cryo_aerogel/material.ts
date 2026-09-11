import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {opticalLine} from '../../helpers.ts'
import knotData from './data.ts'

export default class CryoAerogelMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    this.envMapIntensity = 0.8
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.abs().pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const rayleighSky = mix(color('#38bdf8'), color('#0284c7'), grazing.pow(1.5))
    const rayleighSun = mix(color('#fed7aa'), color('#ffffff'), facing.abs().pow(2))
    const deep = p.sub(view.mul(0.22))
    const needleA = deep.dot(vec3(32, -16, 24)).sin()
    const needleB = deep.dot(vec3(-20, 36, 14)).sin()
    const needles = opticalLine(needleA.mul(needleB), 0.024)
    const sparkle = view.dot(vec3(0.58, 0.72, 0.38).normalize()).abs().pow(32)
    const nebGas = mx_noise_float(deep.mul(8).add(time.mul(0.05))).mul(0.5).add(0.5)
    const nebColor = mix(color('#fb7185'), color('#2dd4bf'), nebGas)
    const nebFilaments = opticalLine(mx_noise_float(deep.mul(18)).sub(0.2), 0.035).mul(near)
    this.colorNode = mix(rayleighSky.mul(0.35), rayleighSun.mul(0.65), facing)
    this.ior = 1.12
    this.transmission = 0.94
    this.thickness = 0.68
    this.dispersion = 0.42
    this.attenuationColor.set('#0369a1')
    this.attenuationDistance = 1.8
    this.roughness = 0.04
    this.clearcoat = 0.88
    this.clearcoatRoughness = 0.025
    this.emissiveNode = nebColor.mul(nebFilaments).mul(near.mul(0.7).add(0.3)).mul(0.85).add(color('#ffffff').mul(needles).mul(sparkle).mul(near).mul(2.2)).add(color('#e0f2fe').mul(needles).mul(near.mul(0.5).add(0.2)).mul(0.8)).add(color('#67e8f9').mul(rim.abs().pow(2)).mul(0.3))
  }
}
