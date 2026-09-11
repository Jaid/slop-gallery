import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec3, vec4} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class SaffronCathedralMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const vault = inner.mul(vec3(12, 4, 12))
    const chambers = mx_noise_float(vault).mul(0.5).add(0.5)
    const arches = opticalLine(vault.x.sin().mul(vault.z.sin()).add(vault.y.cos().mul(0.65)), 0.045)
    const caustics = opticalLine(mx_noise_float(deep.mul(22)), 0.025)
    this.colorNode = mix(color('#b63f0b'), color('#ffcd63'), chambers)
    this.transmission = 0.66
    this.thickness = 0.46
    this.ior = 1.62
    this.dispersion = 0.35
    this.attenuationColor.set('#dc871a')
    this.attenuationDistance = 0.7
    this.roughnessNode = arches.mul(0.045).add(0.06)
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.06
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(8)), 0.001)
    this.emissiveNode = color('#ff9a23').mul(arches).mul(near.mul(0.55).add(0.24)).add(color('#fff0a9').mul(caustics).mul(chambers.pow(2)).mul(near).mul(1.15)).add(color('#d44b08').mul(facing.pow(3)).mul(0.18))
  }
}
