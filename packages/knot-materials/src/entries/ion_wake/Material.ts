import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, normalViewGeometry, time, uv, vec3} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.18
    const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
    const tube = uv()
    const drift = time.mul(0.65)
    const magnetic = view.cross(vec3(0.15, 1, 0.08)).normalize()
    const binormal = magnetic.cross(view).normalize()
    const sheetA = p.mul(vec3(8, 3.5, 8)).dot(magnetic).add(p.y.mul(10)).add(drift)
    const sheetB = p.mul(6.5).dot(binormal).add(tube.x.mul(22)).sub(drift.mul(0.7))
    const sheetC = p.dot(vec3(2.4, 9, -3.1)).add(view.x.mul(6)).add(drift.mul(1.3))
    const wakeA = opticalLine(sheetA.sin(), 0.032)
    const wakeB = opticalLine(sheetB.sin(), 0.028)
    const wakeC = opticalLine(sheetC.mul(1.6).sin(), 0.022).mul(intimate)
    const braid = wakeA.mul(0.9).add(wakeB.mul(0.75)).add(wakeC.mul(0.55)).clamp()
    const scintilla = cellularPoints(p.mul(48).add(vec3(0, time.mul(2.4), 0)), 0.03, 0.18, 0.65).mul(intimate)
    const doppler = magnetic.dot(vec3(p.x, 0, p.z).normalize()).mul(0.5).add(0.5)
    const plasma = mix(color('#3a6cff'), mix(color('#79fff2'), color('#f0b8ff'), doppler), braid)
    const corona = grazing.pow(2.2).mul(near.mul(0.4).add(0.5))
    this.colorNode = color('#02040a')
    this.metalness = 0.15
    this.roughness = 0.22
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.08
    this.iridescence = 0.4
    this.iridescenceIOR = 1.2
    this.iridescenceThicknessNode = facing.mul(220).add(180)
    this.normalNode = proceduralNormal(braid.mul(0.35).add(mx_noise_float(p.mul(16).add(view)).mul(0.2)), 0.004)
    this.emissiveNode = plasma
      .mul(braid)
      .mul(1.65)
      .mul(near.mul(0.65).add(0.5))
      .add(color('#e8ffff').mul(scintilla).mul(2.4))
      .add(mix(color('#1b4dff'), color('#9bfff4'), doppler).mul(corona).mul(0.28))
      .add(color('#6a2aff').mul(rim).mul(0.12))
      .add(color('#ffffff').mul(wakeC).mul(glints(normalViewGeometry, 70)).mul(0.35))
  }
}
