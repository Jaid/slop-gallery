import type {Texture} from 'three/webgpu'

import {color, mx_noise_float, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import viewerFrame, {cellNoiseVec3, proceduralNormal, spectralColor} from '../../helpers.ts'
import knotData from './data.ts'

export default class PlanckFoamMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, view, near} = viewerFrame()
    const q = p.mul(24).add(vec3(time.mul(0.2), time.mul(-0.15), time.mul(0.1)))
    const centre = cellNoiseVec3(q).mul(0.8).add(0.1)
    const dist = q.fract().sub(centre).length()
    const bubble = dist.smoothstep(0.04, 0.28).oneMinus()
    const fluctuate = mx_noise_float(q.mul(0.25).add(time.mul(0.6))).mul(0.5).add(0.5)
    const foam = bubble.mul(fluctuate)
    const chroma = spectralColor(dist.mul(12).add(time.mul(0.4)).add(view.x.mul(1.5)))
    this.colorNode = color('#01030a')
    this.transmission = 0.96
    this.thickness = 0.3
    this.ior = 1.03
    this.roughness = 0.015
    this.metalness = 0
    this.envMapIntensity = 1.3
    this.iridescence = 1
    this.iridescenceIOR = 1.1
    this.iridescenceThicknessNode = foam.mul(450).add(120)
    this.normalNode = proceduralNormal(foam, 0.0005)
    this.emissiveNode = chroma.mul(foam).mul(near.mul(1.1).add(0.4)).add(color('#ffffff').mul(foam.pow(5)).mul(0.6))
  }
}
