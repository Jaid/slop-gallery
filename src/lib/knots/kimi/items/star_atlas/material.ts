import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_noise_vec3, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec4} from 'three/tsl'

import filament, {opticalBands, opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class StarAtlasMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const noise = mx_noise_float(p.mul(5)).mul(0.5).add(0.5)
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    // Two star strata at different parallax depths drift apart as the viewer
    // orbits; engraved constellations catch the light only off-axis.
    const stars = opticalLine(mx_noise_float(inner.mul(8)), 0.02)
    const farStars = opticalLine(mx_noise_float(deep.mul(13).add(31)), 0.018)
    const constellations = filament(mx_noise_float(p.mul(3).add(mx_noise_vec3(p.mul(6)).mul(0.25))), 0.012)
    const meridian = opticalBands(p.y.mul(90).add(view.y.mul(8)))
    this.colorNode = mix(color('#050916'), color('#0d1b3a'), noise)
    this.metalness = 0.15
    this.roughness = 0.09
    this.clearcoat = 1
    this.clearcoatRoughness = 0.035
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(30)).mul(near), 0.0004)
    this.emissiveNode = color('#ffe9a8').mul(stars).mul(near.mul(0.8).add(0.25)).add(color('#9db8ff').mul(farStars).mul(near).mul(0.7)).add(color('#e8c268').mul(constellations).mul(grazing.mul(0.5).add(0.2))).add(color('#ffd75e').mul(meridian).mul(near).mul(0.12))
  }
}
