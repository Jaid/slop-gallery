import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, time, uv, vec3} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Pattern-welded steel with folded strata, etched valleys and satin nickel.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.24)
    this.name = knotData.id
    const {p, view, facing, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const flow = p.mul(2.35).add(vec3(time.mul(0.008), time.mul(-0.006), time.mul(0.005)))
    const warp = mx_fractal_noise_float(flow, 4, 2.05, 0.54)
    const phase = p.dot(vec3(4.1, 2.7, 5.6)).add(warp.mul(5.4)).add(tube.x.mul(TAU * 0.25))
    const broad = phase.sin().mul(0.5).add(0.5)
    const secondary = phase.mul(2.65).add(mx_noise_float(p.mul(3.4)).mul(1.4)).sin().mul(0.5).add(0.5)
    const fine = phase.mul(9.5).sin().abs().pow(0.42)
    const fineFoot = phase.mul(9.5).fwidth().max(0.001)
    const fineResolved = fineFoot.smoothstep(0.45, 1.5).oneMinus()
    const etched = fine.mul(fineResolved).mul(0.32).add(secondary.mul(0.68))
    const nickel = broad.pow(0.72)
    const oxideAngle = view.dot(vec3(0.69, 0.27, -0.67)).mul(0.5).add(0.5)
    const oxide = mix(color('#071521'), color('#32152c'), oxideAngle).add(color('#0d3943').mul(grazing.pow(2.2).mul(0.12)))
    const steel = mix(mix(color('#080b10'), color('#46545e'), nickel), oxide, secondary.mul(0.34))
    const seam = phase.mul(1.35).sin().abs().smoothstep(0.035, 0.16).oneMinus()
    const height = broad.mul(0.24).add(etched.mul(0.12)).add(seam.mul(-0.18))
    const steelNormal = proceduralNormal(height, 0.0045)
    const glint = glints(steelNormal, 86).mul(near).mul(0.1)
    const softReflection = glints(steelNormal, 20).mul(facing.mul(0.32).add(0.68)).mul(0.035)
    this.colorNode = steel.add(color('#9eb5bf').mul(glint.add(softReflection)))
    this.metalness = 1
    this.roughnessNode = float(0.3).add(oxideAngle.mul(0.12)).add(seam.mul(0.12)).add(grazing.mul(0.04)).clamp(0.22, 0.58)
    this.anisotropy = 0.92
    this.anisotropyRotation = Math.PI * 0.5
    this.normalNode = steelNormal
    this.emissiveNode = color('#4c8795').mul(glint.mul(0.012)).add(color('#8a3f25').mul(seam.mul(grazing).mul(intimate).mul(0.008)))
  }
}
