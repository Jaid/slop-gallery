import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {sealScript} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
    const layer0 = sealScript(p, 0.28, 3.1)
    const layer1 = sealScript(p.sub(view.mul(0.028)), 0.34, 11.7)
    const layer2 = sealScript(p.sub(view.mul(0.07)), 0.4, 23.4)
    const ghost = layer1.mul(near.mul(0.75).add(0.1))
    const deepText = layer2.mul(intimate)
    const cut = layer0.mul(near.mul(0.5).add(0.2)).max(ghost.mul(0.85)).max(deepText)
    const verdigris = mix(color('#1f4a3a'), color('#6ea48a'), facing).mul(cut).mul(intimate.mul(0.7).add(0.2))
    const lacquer = mix(color('#4a0908'), color('#c4281c'), grazing.pow(1.5).mul(0.7).add(mx_noise_float(p.mul(2.2)).mul(0.08)).clamp())
    const sealed = mix(color('#2a0706'), lacquer, facing.mul(0.35).add(0.45))
    this.colorNode = mix(mix(sealed, color('#6a120e'), cut.mul(0.55)), verdigris, cut.mul(intimate).mul(0.65))
    this.metalnessNode = cut.mul(0.15)
    this.roughnessNode = float(0.22).mix(0.12, cut).add(grazing.mul(0.05))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.04
    this.normalNode = proceduralNormal(cut.mul(0.55).add(mx_noise_float(p.mul(12)).mul(0.12)), 0.0014)
    this.iridescence = 0.12
    this.iridescenceIOR = 1.45
    this.iridescenceThicknessNode = facing.mul(80).add(160)
    this.emissiveNode = color('#3a0a08')
      .mul(rim)
      .mul(0.18)
      .add(color('#ff6a3a').mul(cut).mul(intimate).mul(0.22))
      .add(verdigris.mul(0.35).mul(near))
  }
}
