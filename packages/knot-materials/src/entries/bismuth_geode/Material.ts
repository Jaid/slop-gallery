import type {Texture} from 'three/webgpu'

import {color, float, mix, normalViewGeometry, time, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cosinePalette} from '../../lib/cosinePalette.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.35)
    this.name = knotData.id
    const {p, facing, grazing, rim, near, intimate} = viewerFrame()
    // Rotated 3D coordinate system to align cubic hopper crystal growth
    const rot = vec3(
      p.x.mul(0.85).add(p.y.mul(0.53)),
      p.y.mul(0.85).sub(p.x.mul(0.53)),
      p.z.mul(0.92).add(p.x.mul(0.39)),
    )
    // Concentric stepped square hopper pyramids
    const scale = 11
    const crystalCoord = rot.mul(scale)
    const cellId = crystalCoord.floor()
    const cellRnd = cellNoiseVec3(cellId)
    const local = crystalCoord.fract().sub(0.5)
    // Chebyshev (L-infinity) metric produces square hopper steps
    const boxDist = local.x.abs().max(local.y.abs())
    const terraceCount = 9
    const stepIndex = boxDist.mul(terraceCount).floor()
    const stepFraction = stepIndex.div(terraceCount).clamp(0, 1)
    // Sharp terrace edges and ridges
    const stepFootprint = boxDist.fwidth().max(0.0001)
    const edgeLip = boxDist.mul(terraceCount).fract()
      .smoothstep(stepFootprint.mul(terraceCount).mul(1.2).add(0.08), 0.02)
    // Stepped relief for the surface normal
    const terraceHeight = stepFraction.mul(0.0045).add(edgeLip.mul(0.0006))
    this.normalNode = proceduralNormal(terraceHeight, 0.92)
    // Thin-film bismuth oxide interference layer
    // Physical oxide thickness grows thicker on outer perimeters and depends on cooling rate
    const oxideThickness = stepFraction.mul(380).add(cellRnd.x.mul(140)).add(160) // 160 to 680 nm
    // Optical path difference through the thin oxide film shifts with viewing angle
    const cosTheta = facing.max(0.18)
    const opticalPath = oxideThickness.div(cosTheta)
    const interferencePhase = opticalPath.mul(0.0135).add(time.mul(0.035))
    // High-purity rainbow interference spectrum
    const oxideColor = cosinePalette(
      interferencePhase,
      [0.55, 0.52, 0.56],
      [0.48, 0.46, 0.45],
      [1, 1, 1],
      [0.05, 0.36, 0.67],
    )
    // Metallic crystal bulk (bright silvery-platinum bismuth beneath the oxide)
    const metallicSubstrate = mix(color('#c5cad0'), color('#e8ecf0'), cellRnd.y.mul(0.2))
    const crystalFace = mix(oxideColor, metallicSubstrate, stepFraction.pow(3).mul(0.25))
    // Physical metallic properties
    this.colorNode = crystalFace
    this.metalness = 1
    this.roughnessNode = mix(float(0.06), float(0.22), stepFraction).add(edgeLip.mul(0.05))
    // Lustrous specular clearcoat
    this.clearcoat = 0.95
    this.clearcoatRoughness = 0.02
    // Angular iridescence
    this.iridescence = 0.8
    this.iridescenceIOR = 1.65
    this.iridescenceThicknessNode = oxideThickness
    // Step edges catch glints from the studio lamps
    const edgeSparkle = glints(normalViewGeometry, 140).mul(edgeLip).mul(near.mul(0.6).add(0.4))
    // Deep cavity luminescence inside the sunken hopper wells
    const cavityGlow = oxideColor.mul(stepFraction.oneMinus().pow(2)).mul(intimate).mul(0.5)
    const grazingLuster = oxideColor.mul(grazing.pow(2.2)).mul(rim).mul(0.45)
    this.emissiveNode = cavityGlow
      .add(color('#ffffff').mul(edgeSparkle).mul(1.4))
      .add(grazingLuster)
  }
}
