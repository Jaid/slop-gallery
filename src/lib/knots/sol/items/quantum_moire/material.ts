import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class QuantumMoireMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const noise = mx_noise_float(p.mul(5)).mul(0.5).add(0.5)
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    // Camera position transformed into object space.
    //
    // All internal layers below are displaced along the actual camera ray
    // rather than screen UVs, so details remain anchored inside the sculpture
    // while walking around it.
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // Two distance gates.
    //
    // Major structures can be read from across the gallery. Fine structures
    // emerge continuously on approach instead of popping into existence.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const inner = p.sub(view.mul(0.16))
    const deep = p.sub(view.mul(0.28))
    const abyss = p.sub(view.mul(0.42))
    // Two polarized gratings live at different depths.
    //
    // Their tiny directional mismatch generates much larger interference
    // structures which continuously reorganize as the visitor walks around.
    const distortionA = mx_noise_float(inner.mul(8)).mul(2.2)
    const distortionB = mx_noise_float(deep.mul(10)).mul(2)
    const phaseA = inner.dot(vec3(37, 11, -23)).add(distortionA).add(view.x.mul(8)).add(time.mul(0.045))
    const phaseB = deep.dot(vec3(34, 13, -25)).add(distortionB).sub(view.y.mul(9)).sub(time.mul(0.037))
    const gratingA = opticalLine(phaseA.sin(), 0.058)
    const gratingB = opticalLine(phaseB.sin(), 0.052).mul(near)
    const ghost = gratingA.mul(gratingB).mul(near)
    const subGrating = opticalLine(abyss.dot(vec3(51, -16, 31)).add(view.z.mul(12)).sin(), 0.044).mul(intimate)
    const hueA = phaseA.mul(0.12).add(view.z.mul(5)).sin().mul(0.5).add(0.5)
    const hueB = phaseB.mul(0.11).sub(view.x.mul(4)).sin().mul(0.5).add(0.5)
    const cyanMagenta = mix(color('#2af6ff'), color('#d84dff'), hueA)
    const violetGold = mix(color('#745dff'), color('#ffc76a'), hueB)
    this.colorNode = mix(color('#01040b'), color('#0b1830'), grazing.mul(0.72).add(noise.mul(0.12)).clamp())
    this.metalness = 0.76
    this.roughnessNode = gratingA.mul(0.055).add(0.09)
    this.iridescenceNode = grazing.mul(0.58).add(0.12)
    this.iridescenceIOR = 1.31
    this.iridescenceThicknessNode = hueA.mul(360).add(90)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.028
    this.normalNode = proceduralNormal(phaseA.sin(), 0.000_75)
    this.emissiveNode = cyanMagenta.mul(gratingA).mul(grazing.mul(0.55).add(0.18)).add(violetGold.mul(gratingB).mul(0.62)).add(color('#f2fbff').mul(ghost).mul(1.35)).add(cyanMagenta.mul(subGrating).mul(0.6))
  }
}
