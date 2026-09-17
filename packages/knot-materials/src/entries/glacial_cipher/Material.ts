import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, vec3} from 'three/tsl'

import {cellGrain} from '../../candidates/gpt_sol/lib/cellGrain.ts'
import {viewerFrame} from '../../candidates/gpt_sol/lib/viewerFrame.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'
import {iceFracture} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 1.1
    const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
    const shallow = iceFracture(p.sub(view.mul(0.035)), 1.1, 17)
    const middle = iceFracture(p.sub(view.mul(0.11)), 2.3, 21)
    const deep = iceFracture(p.sub(view.mul(0.21)), 3.7, 27)
    const fractures = shallow
      .mul(0.65)
      .add(middle.mul(0.8))
      .add(deep.mul(grazing.mul(0.55).add(0.55)))
      .clamp()
    const surface = mx_fractal_noise_float(p.mul(10.5), 3, 2, 0.5)
      .mul(0.5)
      .add(0.5)
    const frost = surface
      .smoothstep(0.64, 0.86)
      .mul(grazing.mul(0.8).add(0.12))
    const bubbles = cellGrain(p.sub(view.mul(0.14)), 58, 0.976)
    const angleTint = view
      .dot(vec3(0.53, -0.21, 0.82).normalize())
      .mul(0.5)
      .add(0.5)
    const paleFactor = facing
      .pow(0.65)
      .mul(0.62)
      .add(angleTint.mul(0.18))
      .clamp()
    const ice = mix(color('#5f9eac'), color('#e8fbff'), paleFactor)
    this.colorNode = mix(ice, color('#f7ffff'), frost.mul(0.7)).mul(fractures.mul(0.08).add(0.82))
    this.transmission = 1
    this.transmissionNode = float(0.94)
      .sub(fractures.mul(0.5))
      .sub(frost.mul(0.42))
      .clamp(0.18, 0.95)
    this.thickness = 0.72
    this.ior = 1.31
    this.dispersion = 0.08
    this.attenuationColor.set('#5ca7b8')
    this.attenuationDistance = 0.65
    this.roughnessNode = float(0.035)
      .add(frost.mul(0.48))
      .add(shallow.mul(0.1))
      .clamp(0.025, 0.58)
    const iceNormal = proceduralNormal(surface
      .mul(0.22)
      .add(shallow.mul(0.55))
      .add(frost.mul(0.2)), 0.0014)
    this.normalNode = iceNormal
    this.clearcoat = 1
    this.clearcoatNormalNode = iceNormal
    this.clearcoatRoughnessNode = float(0.025)
      .add(frost.mul(0.3))
    const fractureTint = mix(color('#63d8ff'), color('#ffffff'), angleTint)
    this.emissiveNode = fractureTint
      .mul(fractures)
      .mul(near.mul(0.75).add(0.18))
      .add(color('#efffff')
        .mul(bubbles.mask)
        .mul(intimate)
        .mul(0.85))
      .add(color('#4e9eb1')
        .mul(rim)
        .mul(0.035))
  }
}
