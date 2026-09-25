import type {Node, Texture} from 'three/webgpu'

import {color, float, Fn, mix, mx_fractal_noise_float, negateOnBackSide, time, transformNormalToView, uv, varying, vec2, vec3} from 'three/tsl'

import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {knotFrame} from '../../lib/knotFrame.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

const waveField = (tube: Node<'vec2'>, slow: Node<'float'>) => {
  const q = tube.mul(vec2(7, 1))
  const warp = mx_fractal_noise_float(vec3(tube.x.mul(4.4), tube.y.mul(3.1), slow.mul(0.018)), 2, 2.07, 0.48)
  const a = q.x.mul(TAU * 2.35).add(q.y.mul(2.1)).add(warp.mul(1.4)).add(slow.mul(0.11)).sin()
  const b = q.x.mul(TAU * 3.7).sub(q.y.mul(TAU * 1.2)).add(warp.mul(-0.9)).sub(slow.mul(0.083)).sin()
  const c = q.x.mul(TAU * 5.9).add(q.y.mul(TAU * 3.1)).add(warp.mul(0.65)).add(slow.mul(0.047)).sin()
  const standing = a.add(b.mul(0.72)).add(c.mul(0.38))
  return {
    warp,
    standing,
    relief: standing.mul(0.0028).add(warp.mul(0.0007)),
  }
}
const porcelainPosition = Fn(([tube]: [Node<'vec2'>]) => {
  const {position, normal} = knotFrame(tube)
  const {relief} = waveField(tube, time)
  return position.add(normal.mul(relief))
})

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.05)
    this.name = knotData.id
    const tube = uv()
    const {warp} = waveField(tube, time)
    const epsilon = 0.0001
    const du = porcelainPosition(tube.add(vec2(epsilon, 0))).sub(porcelainPosition(tube.sub(vec2(epsilon, 0))))
    const dv = porcelainPosition(tube.add(vec2(0, epsilon))).sub(porcelainPosition(tube.sub(vec2(0, epsilon))))
    const formNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.positionNode = porcelainPosition(tube)
    const {p, view, facing, grazing, near, intimate} = viewerFrame()
    const parallaxP = p.sub(view.mul(0.022))
    const fieldP = tube.mul(vec2(7, 1)).add(vec2(parallaxP.x, parallaxP.y).mul(vec2(0.32, 0.76)))
    const phaseA = fieldP.x.mul(TAU * 2.35).add(fieldP.y.mul(2.1)).add(warp.mul(1.4)).add(time.mul(0.11)).sin()
    const phaseB = fieldP.x.mul(TAU * 3.7).sub(fieldP.y.mul(TAU * 1.2)).add(warp.mul(-0.9)).sub(time.mul(0.083)).sin()
    const phaseC = fieldP.x.mul(TAU * 5.9).add(fieldP.y.mul(TAU * 3.1)).add(warp.mul(0.65)).add(time.mul(0.047)).sin()
    const surfaceWave = phaseA.add(phaseB.mul(0.72)).add(phaseC.mul(0.38))
    const node = float(1).sub(surfaceWave.abs().smoothstep(0.022, 0.24))
    const antinode = surfaceWave.abs().div(2.1).oneMinus().clamp()
    const fineField = mx_fractal_noise_float(vec3(fieldP.mul(17), warp.mul(1.2)), 2, 2.11, 0.46).mul(0.5).add(0.5)
    const crazeBoundary = cellularBoundary(p.mul(29).add(vec3(3.1, 7.7, 1.9)))
    const crazeFootprint = crazeBoundary.fwidth().max(0.0001)
    const craze = crazeBoundary.abs().smoothstep(0.025, float(0.025).add(crazeFootprint.mul(1.15))).oneMinus().mul(intimate)
    const angleBlue = view.dot(vec3(0.58, -0.24, 0.78)).mul(0.5).add(0.5)
    const porcelain = mix(color('#e6e2d5'), color('#a9c6cb'), fineField.mul(0.16).add(warp.mul(0.04).add(0.45)))
    const cobalt = mix(color('#123f82'), color('#315fa0'), angleBlue)
    const nodeColor = mix(cobalt, color('#6eb4c1'), node.mul(0.18).oneMinus())
    this.metalness = 0
    this.colorNode = mix(porcelain, nodeColor, node.mul(0.94).add(craze.mul(0.24)).clamp())
    this.clearcoat = 1
    this.clearcoatRoughnessNode = float(0.075).add(node.mul(0.035))
    this.clearcoatNormalNode = proceduralNormal(antinode.mul(0.0007).add(node.mul(-0.00035)).add(craze.mul(-0.00018)).add(fineField.mul(0.00008)), 0.8)
    this.normalNode = negateOnBackSide(formNormal)
    this.sheen = 0.18
    this.sheenColor.set('#d8f3ee')
    this.sheenRoughness = 0.34
    this.iridescence = 0.16
    this.iridescenceThicknessNode = angleBlue.mul(180).add(grazing.mul(90)).add(260)
    this.emissiveNode = color('#2e78d0').mul(node).mul(0.075).mul(near.mul(0.5).add(0.5))
      .add(color('#bdeef0').mul(craze).mul(grazing).mul(0.035))
      .add(color('#fff7df').mul(antinode).mul(facing.pow(5)).mul(0.022))
  }
}
