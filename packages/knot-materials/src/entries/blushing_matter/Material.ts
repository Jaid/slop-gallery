import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, negateOnBackSide, time, vec3} from 'three/tsl'

import {bumpNormal} from '../../candidates/gpt_astra/lib/bumpNormal.ts'
import {line} from '../../candidates/gpt_astra/lib/line.ts'
import {viewerFrame} from '../../candidates/gpt_astra/lib/viewerFrame.ts'
import {visibility} from '../../candidates/gpt_astra/lib/visibility.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    // ---------------------------------------------------------------
    // Thermochromic elastomer that appears to become self-conscious.
    // An approaching observer warms the facing surface from cool
    // smoke to rose; intimate viewing raises almost imperceptible
    // gooseflesh and reveals a shallow pigment-capillary network.
    // ---------------------------------------------------------------
    const {p, view, facing, grazing, near, intimate} = viewerFrame()
    const mottling = mx_noise_float(p.mul(4.2))
    const pulse = time.mul(0.72)
      .add(p.y.mul(5))
      .sin()
      .mul(0.025)
      .mul(near)
    const heat = near.mul(0.66)
      .add(facing.pow(3).mul(near).mul(0.45))
      .add(mottling.mul(0.07))
      .add(pulse)
    const activation = heat.smoothstep(0.34, 0.78)
    const flushed = heat.smoothstep(0.67, 1.08)
    const warmPigment = mix(color('#f1b1a4'), color('#d73558'), flushed)
    const body = mix(color('#a5b3c0'), warmPigment, activation)
    const under = p.sub(view.mul(grazing.mul(0.004).add(0.006)))
    const capillaryField = mx_noise_float(under.mul(24))
      .add(mx_noise_float(under.mul(51)).mul(0.32))
    const capillaries = line(capillaryField, 0.008)
      .mul(intimate)
      .mul(activation)
      .mul(0.13)
    const poreQ = p.mul(vec3(160, 120, 160))
    const poreVisibility = visibility(poreQ.fwidth().length()).mul(near)
    const pores = mx_noise_float(poreQ)
      .smoothstep(0.25, 0.6)
    const bumpQ = p.mul(70)
    const gooseflesh = mx_noise_float(bumpQ)
      .mul(0.5)
      .add(0.5)
      .clamp()
      .pow(6)
      .mul(visibility(bumpQ.fwidth().length()))
      .mul(intimate)
    this.colorNode = mix(body, color('#96314d'), capillaries).mul(pores.mul(poreVisibility).mul(-0.045).add(1))
    this.metalness = 0
    this.ior = 1.41
    this.specularIntensity = 0.55
    this.roughnessNode = float(0.6)
      .sub(activation.mul(0.08))
      .add(pores.mul(poreVisibility).mul(0.04))
    this.retroreflectivityNode = activation.mul(0.08).add(0.12)
    this.clearcoat = 0.12
    this.clearcoatRoughness = 0.28
    this.normalNode = negateOnBackSide(bumpNormal(pores.mul(poreVisibility).mul(-0.0001)
      .add(gooseflesh.mul(0.0008))))
    // A deliberately small wrap term suggests sub-surface
    // scattering without making the elastomer look luminous.
    this.emissiveNode = color('#ffad86')
      .mul(grazing.pow(3))
      .mul(activation.mul(0.015).add(0.025))
      .mul(near)
  }
}
