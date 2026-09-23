import type {Node, Texture} from 'three/webgpu'

import {bitangentLocal, color, float, mix, mx_noise_float, mx_noise_vec3, normalLocal, tangentLocal, time, vec3} from 'three/tsl'

import {beads} from '../../lib/beads.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.5)
    this.name = knotData.id
    const {p, view, grazing, near, intimate} = viewerFrame()
    const n = normalLocal.normalize()
// Each diffraction grain tilts its own lattice, so no two patches ever share a color.
    const warp = mx_noise_vec3(p.mul(2.6)).mul(0.22)
    const q = p.mul(4.4).add(warp)
    const grain = cellNoiseVec3(q)
    const tilt = tangentLocal.add(0.0001).mul(grain.y.sub(0.5)).add(vec3(bitangentLocal as unknown as Node<'vec3'>).add(0.0001).mul(grain.z.sub(0.5))).mul(1.5)
    const patchNormal = n.add(tilt).add(0.0001).normalize()
    const angle = view.dot(patchNormal).mul(2.2).add(grain.x.mul(TAU)).add(time.mul(0.05))
    const digit = q.x.mul(2.4).add(q.y.mul(1.5)).add(view.dot(patchNormal).mul(1.8)).add(grain.y.mul(TAU))
    const bands = opticalBands(digit.mul(TAU).add(0.3))
    const fire = spectralColor(angle.mul(TAU))
    const flame = fire.mul(fire).mul(1.25)
    const facing = view.dot(patchNormal).clamp().pow(1.4)
    const milk = mx_noise_float(p.mul(3.5)).mul(0.5).add(0.5)
    const potch = mix(color('#0f1118'), color('#565a68'), milk.pow(2.2))
    const pin = beads(q.mul(2.2), 3.3)
// A whisper of relief keeps the polish from reading as a decal.
    this.normalNode = proceduralNormal(milk.mul(0.0016).add(bands.mul(facing).mul(0.0009)), 0.6)
    this.colorNode = mix(potch, flame.mul(0.5), bands.mul(facing).mul(0.55))
    this.metalness = 0
    this.roughnessNode = mix(float(0.09), float(0.03), milk)
    this.clearcoat = 0.6
    this.clearcoatRoughness = 0.03
    this.iridescence = 0.25
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = grain.x.mul(240).add(300)
    this.envMapIntensity = 0.85
    this.emissiveNode = flame.mul(bands.mul(0.75).add(0.12)).mul(facing).mul(intimate.mul(0.55).add(0.8)).mul(1.35).add(fire.mul(pin.core).mul(near).mul(1.4)).add(color('#aab8ff').mul(grazing.pow(3)).mul(0.2))
  }
}
