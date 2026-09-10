import type {Texture} from 'three/webgpu'

import {color, mx_noise_float, time, vec3} from 'three/tsl'
import {proceduralNormal} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'
import {viewerFrame} from '../../helpers.ts'
export default class QuicksilverEchoMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    // A flawless mercury mirror from a distance. Walk up and it senses you: concentric ripples spread from the
    // point of the surface nearest to your eyes and follow you as you move, while a soft white presence glows
    // exactly where the surface faces you, as if the sculpture were reflecting your gaze.
    const { p, cameraLocal, facing, distance } = viewerFrame()
    const reach = cameraLocal.sub(p).length()
    const wake = distance.smoothstep(0.9, 5).oneMinus()
    const ringsA = reach.mul(48).sub(time.mul(3.2)).sin()
    const ringsB = reach.mul(17).sub(time.mul(1.1)).add(mx_noise_float(p.mul(3)).mul(2)).sin()
    const idle = mx_noise_float(p.mul(6).add(vec3(time.mul(0.08), 0, time.mul(0.05))))
    const envelope = facing.pow(1.5).mul(0.7).add(0.3).mul(wake)
    const height = ringsA.mul(0.7).add(ringsB.mul(0.5)).mul(envelope).add(idle.mul(0.5))
    const crest = height.smoothstep(0.7, 1.1)
    this.colorNode = color('#f1f5ff')
    this.metalness = 1
    this.roughnessNode = height.abs().mul(0.02).add(0.02)
    this.normalNode = proceduralNormal(height, 0.0035)
    this.emissiveNode = color('#bcd6ff').mul(crest).mul(wake).mul(0.3).add(color('#ffffff').mul(facing.pow(40)).mul(wake).mul(0.45))
  }
}
