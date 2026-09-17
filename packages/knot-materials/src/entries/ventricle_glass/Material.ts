import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, normalViewGeometry, vec3} from 'three/tsl'

import {dendriticField} from '../../candidates/grok/lib/dendriticField.ts'
import {heartbeat} from '../../candidates/grok/lib/heartbeat.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {liquidNormal} from '../../lib/liquidNormal.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
    const beat = heartbeat()
    const inner = p.sub(view.mul(0.16))
    const deep = p.sub(view.mul(0.3))
    const chamber = mx_fractal_noise_float(inner.mul(4.2).add(vec3(0, beat.mul(0.12), 0)), 3, 2, 0.5)
    const vessel = dendriticField(inner, 11)
    const capillaries = dendriticField(deep.add(vec3(2.2, -1.4, 0.7)), 24)
    const artery = opticalLine(vessel.mul(6.5), 0.05)
    const capillary = opticalLine(capillaries.mul(8), 0.03).mul(intimate)
    const lumen = chamber.smoothstep(-0.15, 0.4).oneMinus().mul(facing.mul(0.4).add(0.6))
    const plasma = mix(color('#3a0014'), color('#ff6b8a'), lumen.add(beat.mul(0.15)))
    const veinLight = mix(color('#6b0018'), color('#ffd1c8'), capillary.add(artery))
    this.colorNode = mix(color('#1a0308'), plasma, lumen.mul(0.55).add(0.2))
    this.metalness = 0
    this.roughnessNode = artery.mul(-0.06).add(0.08)
    this.transmission = 0.78
    this.thicknessNode = beat.mul(0.12).add(0.42)
    this.ior = 1.46
    this.dispersion = 0.18
    this.attenuationColor.set('#6a1028')
    this.attenuationDistance = 0.28
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.iridescence = 0.22
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = facing.mul(120).add(280)
    this.normalNode = liquidNormal(intimate.mul(0.6).add(0.2), 0.09)
    this.emissiveNode = veinLight
      .mul(artery.add(capillary.mul(0.8)))
      .mul(beat)
      .mul(1.15)
      .mul(near.mul(0.55).add(0.5))
      .add(color('#ff8aa8').mul(lumen).mul(beat).mul(0.22).mul(intimate.mul(0.5).add(0.35)))
      .add(color('#4a0010').mul(rim).mul(0.16))
      .add(color('#fff0e8').mul(glints(normalViewGeometry, 90)).mul(grazing).mul(0.08))
  }
}
