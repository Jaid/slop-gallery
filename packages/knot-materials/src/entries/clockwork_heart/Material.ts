import type {Texture} from 'three/webgpu'

import {color, mix, normalViewGeometry, time, uv} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import {hairline as opticalLine} from '../../lib/hairline.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {brassGear} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    // A heart of brass behind smoked glass: counter-turning wheels on two parallax
    // planes, a gold mainspring coiled around the shell, an escapement that ticks.
    const {p, view, facing, near} = viewerFrame()
    const tube = uv()
    const qNear = p.sub(view.mul(0.05))
    const qFar = p.sub(view.mul(0.12))
    const rotA = time.mul(1.1)
    const rotB = time.mul(-0.7)
    const rotC = time.mul(3).floor().div(3).mul(0.42)
    const gearA = brassGear(qFar, 0.17, 0.36, 14, rotA)
    const gearB = brassGear(qNear, -0.14, 0.48, 22, rotB)
    const gearC = brassGear(qNear, 0, 0.26, 10, rotC)
    const mechanism = gearA.max(gearB).max(gearC)
    const detail = gearA.add(gearB.mul(0.8)).add(gearC.mul(1.1)).clamp()
    const brass = mix(color('#5d4715'), color('#ffd98c'), detail)
    const coil = opticalLine(tube.x.mul(Math.PI * 2 * 24).add(tube.y.mul(Math.PI * 2)).sin(), 0.2)
    const pulse = time.mul(0.75).sin()
    const beat = pulse.mul(pulse).mul(0.45).add(0.7)
    const tickFlash = time.mul(3).fract().mul(-14).exp()
    const vis = facing.mul(0.55).add(0.45)
    this.colorNode = mix(mix(color('#151009'), brass, mechanism.mul(0.85)), color('#d8a63e'), coil.mul(0.85))
    this.transmission = 0.9
    this.transmissionNode = mechanism.mul(-0.7).add(0.92).clamp()
    this.roughness = 0.06
    this.ior = 1.5
    this.thickness = 0.22
    this.dispersion = 0.2
    this.attenuationColor.set('#3a2a12')
    this.attenuationDistance = 0.6
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.envMapIntensity = 1.2
    this.emissiveNode = brass.mul(mechanism).mul(vis).mul(near.mul(0.8).add(0.35)).mul(beat).add(brass.mul(gearC).mul(tickFlash).mul(0.6)).add(color('#ffd98c').mul(coil).mul(0.35)).add(color('#ffe9c0').mul(glints(normalViewGeometry, 90)).mul(coil).mul(0.5))
  }
}
