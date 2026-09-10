import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'
import {liquidNormal, opticalLine} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class BiolumeTideMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    // Dormant from across the lobby — the swarm wakes as the visitor closes
    // in (near-gated emissive), then ripples past in traveling waves.
    const drift = vec3(time.mul(0.03), time.mul(-0.02), time.mul(0.025))
    const plankton = mx_noise_float(inner.mul(13).add(drift))
    const bloom = opticalLine(plankton, 0.035)
    const schools = opticalLine(mx_noise_float(deep.mul(24).sub(drift.mul(2))), 0.024)
    const wave = inner.y.mul(6).add(inner.x.mul(3)).sub(time.mul(0.9)).sin().mul(0.5).add(0.5).pow(3)
    this.colorNode = mix(color('#01070f'), color('#062335'), plankton.abs().mul(2).clamp())
    this.transmission = 0.42
    this.thickness = 0.44
    this.ior = 1.48
    this.attenuationColor.set('#044a5e')
    this.attenuationDistance = 0.55
    this.roughness = 0.11
    this.clearcoat = 0.95
    this.clearcoatRoughness = 0.04
    this.normalNode = liquidNormal(near, 0.2)
    this.emissiveNode = color('#1affc8').mul(bloom).mul(wave.mul(0.7).add(0.3)).mul(near.mul(1.1).add(0.08)).add(color('#3f8cff').mul(schools).mul(near).mul(0.8)).add(color('#0affea').mul(rim).mul(0.12))
  }
}
