import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import {ruled, stroke, wave} from '../../candidates/gpt_astra/lib/surface/coverage.ts'
import {exhibitionFrame} from '../../candidates/gpt_astra/lib/surface/frame.ts'
import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

/** Cobalt bathymetry floats just below a warm, crazed porcelain glaze. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85)
    this.name = knotData.id
    const {p, view, near, intimate, grazing} = exhibitionFrame()
    const submerged = p.sub(view.mul(0.008))
    const drift = vec3(time.mul(0.12).sin(), 0, time.mul(0.12).cos()).mul(0.035)
    const terrain = mx_noise_float(submerged.mul(3.5).add(drift))
      .add(mx_noise_float(submerged.mul(10.5).add(4.2)).mul(0.16))
    const sea = terrain.smoothstep(-0.09, 0.12)
    const depth = terrain.smoothstep(0.03, 0.46)
    const contours = ruled(terrain.mul(19), 0.06)
    const white = mix(color('#e5dfca'), color('#fff9ed'), mx_noise_float(p.mul(22)).mul(0.1).add(0.72))
    const blue = mix(color('#34668c'), color('#071b55'), depth)
    const pigment = mix(blue, color('#93b9cc'), contours.mul(0.55))
    const coastline = stroke(terrain.add(0.035), 0.008)
    // The gold chart is fixed to the surface; its pigment has a different parallax depth.
    const chart = uv().mul(vec2(36, 6))
    const meridians = ruled(chart.x, 0.007).add(ruled(chart.y, 0.007)).clamp().mul(0.48)
    const registration = chart.fract().sub(0.5).length()
    const compass = stroke(registration.sub(0.115), 0.008, chart.fwidth().length())
    const gold = coastline.mul(0.65).add(meridians).add(compass.mul(intimate).mul(0.6)).clamp()
    const crack = stroke(cellularBoundary(p.mul(34)), 0.017).mul(0.19)
    const glaze = mix(mix(white, pigment, sea), color('#8d9a9a'), crack)
    const leaf = mix(color('#ac7836'), color('#ebc57b'), grazing.mul(0.5).add(0.35))
    this.colorNode = mix(glaze, leaf, gold)
    this.metalnessNode = gold.mul(0.76)
    this.roughnessNode = float(0.24).sub(sea.mul(0.065)).add(crack.mul(0.1))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.09
    this.ior = 1.52
    const orangePeel = mx_noise_float(p.mul(145)).mul(0.000045).mul(intimate.mul(0.7).add(0.3))
    this.normalNode = proceduralNormal(orangePeel.add(gold.mul(0.00014)).sub(crack.mul(0.00011)), 1)
    const glimmer = wave(terrain.mul(36).sub(time.mul(0.4)))
    this.emissiveNode = color('#83baca').mul(contours).mul(sea).mul(glimmer).mul(near).mul(0.022)
  }
}
