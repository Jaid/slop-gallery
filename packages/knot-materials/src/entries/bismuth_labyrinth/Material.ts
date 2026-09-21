import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, positionGeometry, time, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.2)
    this.name = knotData.id

    // Bismuth crystal: sharp stepped terraces with rainbow oxide film.
    // The terraces form a maze-like pattern that shifts with viewing angle.

    const {view, facing, grazing, near, intimate} = viewerFrame()
    const p = positionGeometry
    // Stepped terrace field — quantized noise creates flat plateaus with sharp edges
    const terraceField = mx_noise_float(p.mul(7)).mul(0.5).add(0.5)
    // Quantize into discrete steps (bismuth's characteristic staircase)
    const numSteps = 8
    const stepped = terraceField.mul(numSteps).floor().div(numSteps)
    const stepFraction = terraceField.mul(numSteps).fract()
    // Sharp edges between steps
    const edgeWidth = 0.06
    const stepEdge = stepFraction.smoothstep(0, edgeWidth)
      .mul(stepFraction.smoothstep(1, 1 - edgeWidth))
    // Secondary finer terracing for detail at close range
    const fineField = mx_noise_float(p.mul(18).add(13.7)).mul(0.5).add(0.5)
    const fineStepped = fineField.mul(numSteps * 2).floor().div(numSteps * 2)
    const fineStepFraction = fineField.mul(numSteps * 2).fract()
    const fineEdge = fineStepFraction.smoothstep(0, edgeWidth * 0.7)
      .mul(fineStepFraction.smoothstep(1, 1 - edgeWidth * 0.7))
      .mul(near)
    // Combined height for terracing
    const height = stepped.mul(0.8).add(fineStepped.mul(0.2).mul(near))
    const terraceHeight = height.mul(0.035)
    // Extreme iridescence — bismuth's signature rainbow oxide coating
    const iriPhase = height.mul(12)
      .add(view.dot(vec3(0.7, 0.3, 0.6).normalize()).mul(8))
      .add(facing.mul(4))
      .add(time.mul(0.05))
    const iriColor = spectralColor(iriPhase)
    // Oxide mask — not all surfaces equally oxidized
    const oxideMask = terraceField.smoothstep(0.15, 0.55)
    // Bismuth base metal color
    const metalBase = mix(
      color('#7a7268'),
      color('#d8d0c4'),
      stepEdge.mul(0.5).add(fineEdge.mul(0.3)),
    )
    // Color: blend metal base with iridescent oxide
    this.colorNode = mix(
      metalBase,
      iriColor.mul(oxideMask.mul(0.8).add(0.2)),
      oxideMask.mul(0.7).add(grazing.mul(0.2)).clamp(),
    )
    this.metalness = 1
    this.roughnessNode = float(0.08)
      .add(stepEdge.oneMinus().mul(0.18))
      .clamp(0.04, 0.35)
    // Strong native iridescence
    this.iridescence = 1
    this.iridescenceIOR = 2.4
    this.iridescenceThicknessNode = height.mul(380).add(grazing.mul(120)).add(180)
    this.clearcoat = 0.6
    this.clearcoatRoughness = 0.04
    // Normals — flat terrace faces with sharp step edges
    this.normalNode = proceduralNormal(terraceHeight, 1.2)
    // Displacement — actual stepped relief
    this.positionNode = positionGeometry.add(normalLocal.mul(terraceHeight))
    // Emissive — specular fire along edges
    const edgeHighlight = stepEdge.oneMinus().mul(fineEdge.oneMinus())
    const edgeGlow = edgeHighlight.mul(facing.pow(3)).mul(near)
    const spectralFire = grazing.pow(5).mul(iriColor)
    this.emissiveNode = iriColor.mul(edgeGlow).mul(0.4)
      .add(spectralFire.mul(0.25))
      .add(iriColor.mul(intimate).mul(edgeHighlight).mul(0.1))
  }
}
