import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, normalViewGeometry, time, uv, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
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
    // matte silicon etched with gold; data pulses race the buses, fine logic fades in up close
    this.envMapIntensity = 1.1
    const {p, rim, near, intimate} = viewerFrame()
    const tube = uv()
    const col = tube.x.mul(36).floor()
    const row = tube.y.mul(8).floor()
    const cellRnd = cellNoiseVec3(vec3(col, row, 1.3))
    const localX = tube.x.mul(36).fract()
    const localY = tube.y.mul(8).fract()
    const bus = opticalLine(localY.sub(0.5), 0.05)
    const jumper = opticalLine(localX.sub(cellRnd.y), 0.05).mul(cellRnd.x.smoothstep(0.62, 0.68)).mul(bus.oneMinus())
    const pad = vec2(localX.sub(cellRnd.y), localY.sub(0.5)).length().smoothstep(0.1, 0.16).oneMinus().mul(cellRnd.z.smoothstep(0.55, 0.65))
    const trace = bus.max(jumper).max(pad).clamp()
    const fineCells = cellNoiseVec3(vec3(tube.x.mul(144).floor(), tube.y.mul(32).floor(), 9.1))
    const fineBus = opticalLine(tube.y.mul(32).fract().sub(0.5), 0.03).mul(intimate)
    const fineJumper = opticalLine(tube.x.mul(144).fract().sub(0.5), 0.03).mul(fineCells.x.smoothstep(0.5, 0.6)).mul(intimate)
    const traces = trace.max(fineBus.mul(0.7)).max(fineJumper.mul(0.7)).clamp()
    const silicon = mx_fractal_noise_float(p.mul(26), 2, 2, 0.5).mul(0.5).add(0.5)
    const rowRnd = cellNoiseVec3(vec3(row, 7.7, 3.1)).x
    const pulse = tube.x.mul(Math.PI * 6).sub(time.mul(rowRnd.mul(3).add(1.5))).add(rowRnd.mul(6.28)).sin().mul(0.5).add(0.5).pow(24)
    this.colorNode = mix(mix(color('#05070a'), color('#10141a'), silicon), color('#c9a24e'), traces)
    this.metalnessNode = traces.mul(0.85).add(0.1)
    this.roughnessNode = float(0.5).add(silicon.mul(0.15)).sub(traces.mul(0.28)).clamp()
    this.anisotropy = 0.6
    this.normalNode = proceduralNormal(traces.mul(0.6), 0.0012)
    this.emissiveNode = color('#7fe9ff').mul(pulse).mul(bus.add(pad)).mul(1.6).mul(near.mul(0.5).add(0.6))
      .add(color('#ffd76a').mul(pad).mul(glints(normalViewGeometry, 80)).mul(0.9))
      .add(color('#7fe9ff').mul(fineBus.add(fineJumper)).mul(intimate).mul(0.5))
      .add(color('#20303f').mul(rim).mul(0.2))
  }
}
