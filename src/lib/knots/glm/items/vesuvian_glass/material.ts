import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_noise_vec3, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import filament, {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class VesuvianGlassMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const noise = mx_noise_float(p.mul(5)).mul(0.5).add(0.5)
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const crawl = mx_noise_vec3(p.mul(9).add(vec3(0, time.mul(0.02), 0))).mul(0.45)
    const cracks = filament(mx_noise_float(inner.mul(5.5).add(crawl)), 0.028)
    const deepCracks = filament(mx_noise_float(deep.mul(14)), 0.02)
    // Slow thermal tide; the vein network breathes instead of blinking.
    const breath = inner.y.mul(0.35).add(time.mul(0.15)).sin().mul(0.5).add(0.62)
    const heat = cracks.mul(1.3).add(deepCracks.mul(0.6)).mul(breath).mul(near.mul(0.75).add(0.4))
    const magma = mix(mix(color('#4a0d02'), color('#ff7524'), heat.clamp()), color('#fff3c4'), heat.pow(5).clamp())
    this.colorNode = mix(color('#050403'), color('#241812'), noise)
    this.transmission = 0.3
    this.thickness = 0.5
    this.ior = 1.5
    this.attenuationColor.set('#33110a')
    this.attenuationDistance = 0.45
    this.roughnessNode = heat.clamp().mul(-0.03).add(0.075)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.04
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(16)), 0.0016)
    this.emissiveNode = magma.mul(heat).mul(grazing.mul(0.25).add(0.85)).add(color('#ff4d26').mul(rim.pow(2)).mul(heat.mul(1.5).clamp()).mul(0.35))
  }
}
