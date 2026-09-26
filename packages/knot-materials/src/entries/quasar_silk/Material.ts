import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec3} from 'three/tsl'

import {tubeRay} from '../../lib/atelier.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** A woven field of almost impossibly fine filament. The physical anisotropic highlight travels along the knot while several view-shifted thread layers make the cloth feel deep enough to enter. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.96)
    this.name = knotData.id
    const {grazing, intimate, near, p, rim} = viewerFrame()
    const tube = uv()
    const parallax = tubeRay()
    const middle = tube.sub(parallax.mul(0.045))
    const back = tube.sub(parallax.mul(0.11))
    const weaveWave = tube.x.mul(TAU * 25).sin().mul(tube.y.mul(TAU * 17).sin())
    const overWarp = weaveWave.smoothstep(-0.1, 0.1).mul(0.78).add(0.11)
    const warp = opticalBands(tube.x.mul(258).add(tube.y.mul(3.2)))
    const weft = opticalBands(middle.y.mul(214).sub(middle.x.mul(4.6)))
    const deepWarp = opticalBands(back.x.mul(143).add(back.y.mul(8.8))).mul(intimate)
    const thread = warp.mul(overWarp).add(weft.mul(overWarp.oneMinus())).add(deepWarp.mul(0.35)).clamp()
    const organic = mx_noise_float(p.mul(8)).mul(0.5).add(0.5)
    const pulsePhase = tube.x.mul(TAU * 2.4).sub(time.mul(0.32)).add(p.dot(vec3(-1.3, 0.7, 1.1)))
    const current = pulsePhase.sin().mul(0.5).add(0.5).pow(5)
    const warpColor = mix(color('#102872'), color('#08c7ed'), warp.mul(0.68).add(organic.mul(0.1)))
    const weftColor = mix(color('#32134f'), color('#e544b7'), weft.mul(0.7).add(organic.mul(0.08)))
    const textile = mix(weftColor, warpColor, overWarp)
    const starThread = spectralColor(tube.x.mul(7).add(tube.y.mul(4).add(time.mul(0.02))).add(organic.mul(2)))
    const relief = thread.mul(0.66).add(overWarp.mul(0.18)).add(organic.mul(0.08))
    this.colorNode = mix(color('#050a20'), textile, thread.mul(0.83).add(0.11))
    this.metalnessNode = float(0.16).add(thread.mul(0.17))
    this.roughnessNode = float(0.38).sub(thread.mul(0.19)).add(organic.mul(0.09)).clamp(0.13, 0.54)
    this.anisotropy = 0.82
    this.anisotropyRotation = 0.03
    this.sheen = 0.72
    this.sheenColor.set('#8bdcf2')
    this.sheenRoughness = 0.38
    this.clearcoatNode = thread.mul(0.22)
    this.clearcoatRoughness = 0.13
    this.normalNode = proceduralNormal(relief, 0.0011)
    this.emissiveNode = starThread.mul(thread).mul(current).mul(intimate.mul(0.55).add(0.13)).mul(0.31)
      .add(color('#276cff').mul(deepWarp).mul(rim).mul(0.16))
      .add(color('#6edbff').mul(grazing.pow(3)).mul(near).mul(0.07))
  }
}
