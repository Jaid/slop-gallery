import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, vec3} from 'three/tsl'

import {viewerFrame} from '../../candidates/gpt_sol/lib/viewerFrame.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'
import {stormBolt} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.42
    const {p, view, facing, rim, near, intimate} = viewerFrame()
    const chord = facing
      .mul(0.3)
      .add(0.06)
    const drift = vec3(time.mul(0.025), time.mul(-0.06), time.mul(0.018))
    const steps = 6
    let stormGlow: Node<'vec3'> = vec3(0)
    let cloudSum: Node<'float'> = float(0)
    let veil: Node<'float'> = float(1)
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps
      const q = p.sub(view.mul(chord.mul(t)))
      const cloud = mx_noise_float(q.mul(4.2)
        .add(drift)
        .add(i * 2.73))
        .mul(0.5)
        .add(0.5)
        .smoothstep(0.5, 0.84)
      const mainBolt = stormBolt(q, i * 0.73 + 1.2)
      const fineBolt
        = i % 2 === 0 ? stormBolt(q.mul(1.72).add(4.7), i + 11.4)
          .mul(intimate)
          .mul(0.48) : float(0)
      const bolt = mainBolt
        .add(fineBolt)
        .clamp()
      const tint = mix(color('#759dff'), color('#fff8dc'), cloud
        .mul(0.35)
        .add(t * 0.65)
        .clamp())
      const depthWeight
        = 1 - Math.abs(t - 0.45) * 0.7
      stormGlow = stormGlow.add(tint
        .mul(bolt)
        .mul(veil)
        .mul(depthWeight))
      cloudSum = cloudSum.add(cloud)
      veil = veil.mul(float(1)
        .sub(cloud.mul(0.12))
        .clamp(0.78, 1))
    }
    const clouds = cloudSum.div(steps)
    this.colorNode = mix(color('#02050a'), color('#25384d'), clouds
      .mul(0.52)
      .add(rim.mul(0.16))
      .clamp())
    this.transmission = 1
    this.transmissionNode = float(0.82)
      .sub(clouds.mul(0.38))
      .clamp(0.3, 0.84)
    this.thickness = 0.76
    this.ior = 1.46
    this.dispersion = 0.1
    this.attenuationColor.set('#1b3151')
    this.attenuationDistance = 0.72
    this.roughnessNode = clouds
      .mul(0.18)
      .add(0.035)
      .clamp(0.03, 0.24)
    this.clearcoat = 1
    this.clearcoatRoughnessNode = clouds
      .mul(0.1)
      .add(0.018)
    const surfaceNoise = mx_noise_float(p.mul(18).add(drift.mul(0.2)))
    this.normalNode = proceduralNormal(surfaceNoise, 0.0008)
    const charge = near
      .mul(0.9)
      .add(0.25)
    this.emissiveNode = stormGlow
      .div(steps)
      .mul(8.5)
      .mul(charge)
      .add(color('#46388e')
        .mul(rim)
        .mul(0.09))
  }
}
