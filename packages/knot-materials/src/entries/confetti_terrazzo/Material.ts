import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, positionGeometry, uv, vec2} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'
import {aggregateField, aggregatePeriods} from './util.ts'

export default class ConfettiTerrazzoMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.75)
    this.name = knotData.id
    const tube = uv()
    const field = aggregateField(tube)
    const footprint = tube.mul(vec2(...aggregatePeriods)).fwidth().length()
    const detail = footprint.smoothstep(0.35, 1.2).oneMinus()
    // The second-neighbor gap cuts angular chips, not circular pebbles or glowing cells.
    const inset = field.z.mul(0.09).add(0.055)
    const chip = field.x.smoothstep(inset, inset.add(footprint.mul(0.65).max(0.012)))
      .mul(field.y.smoothstep(0.09, 0.14))
    const pigment = mix(color('#b94632'), color('#2c7474'), field.y.step(0.4))
    const aggregate = mix(pigment, color('#e1ae45'), field.y.step(0.66))
    const stone = mix(aggregate, color('#293e55'), field.y.step(0.84))
    const cement = color('#ecdec7')
    const specklePoint = positionGeometry.mul(230)
    const speckle = mx_noise_float(specklePoint)
      .mul(specklePoint.fwidth().length().smoothstep(0.3, 1.4).oneMinus())
    const surface = mix(cement, stone, chip)
    // Resolve distant aggregate to a warm material average, not unstable single-chip colors.
    this.colorNode = mix(color('#ae9e83'), surface, detail).mul(speckle.mul(0.035).add(1))
    this.metalness = 0
    this.roughnessNode = float(0.48).sub(chip.mul(detail).mul(0.15)).add(speckle.mul(0.025))
    this.clearcoat = 0.18
    this.clearcoatRoughness = 0.3
    this.specularIntensity = 0.55
    this.normalNode = proceduralNormal(chip.mul(detail).mul(0.00014).add(speckle.mul(0.000035)), 1)
  }
}
