import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time} from 'three/tsl'

import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * A porcelain vessel that has suffered damage and been repaired in living gold.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.05)
    this.name = knotData.id
    const {p, grazing, near, view} = viewerFrame()
    const warp = mx_noise_float(p.mul(7)).mul(0.11)
    const q = p.add(warp).mul(4.4)
    const boundary = cellularBoundary(q)
    const gold = boundary.smoothstep(0.018, 0.105).oneMinus()
    const hollow = boundary.smoothstep(0.012, 0.034).oneMinus()
    const hair = cellularBoundary(p.add(warp).mul(15)).smoothstep(0.008, 0.036).oneMinus().mul(near)
    const fleck = mx_noise_float(p.mul(90)).smoothstep(0.57, 0.78).mul(near)
    const milk = mx_noise_float(p.mul(2.6)).mul(0.5).add(0.5)
    const ground = mix(color('#c2d9d7'), color('#faf4e4'), milk.mul(0.55).add(0.3))
    const shadow = color('#203541')
    const gild = mix(color('#a65327'), color('#ffdc79'), grazing.mul(0.48).add(milk.mul(0.52)))
    const living = time.mul(0.75).sub(boundary.mul(14)).add(view.x.mul(3)).sin().mul(0.5).add(0.5).pow(9)
    this.colorNode = mix(mix(ground, shadow, hollow.mul(0.65)), gild, gold.mul(0.88).add(hair.mul(0.12)).clamp())
    this.metalnessNode = gold.mul(0.91).add(hair.mul(0.25))
    this.roughnessNode = float(0.29).add(gold.mul(-0.16)).add(fleck.mul(0.11))
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.08
    this.normalNode = proceduralNormal(gold.mul(0.65).sub(hollow.mul(0.3)).add(mx_noise_float(p.mul(65)).mul(0.07)), 0.0022)
    this.emissiveNode = color('#ffc568').mul(gold).mul(living.mul(0.7).add(grazing.pow(3).mul(0.22))).add(color('#fff7dd').mul(hair).mul(fleck).mul(0.11)).add(color('#ffdba6').mul(gold).mul(near).mul(0.035))
    this.aoNode = float(1).sub(hollow.mul(0.19))
  }
}
