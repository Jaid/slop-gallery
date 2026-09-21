import type {Texture} from 'three/webgpu'

import {color, float, mix, normalLocal, positionGeometry, uv} from 'three/tsl'

import {thinFilm} from '../../candidates/gemini_flash/lib/thinFilm.ts'
import {hairline} from '../../lib/hairline.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
    const tube = uv()
    const {facing, grazing, rim, near} = viewerFrame()
    // Micro-corrugated pleated facets: analytic periodic height for the vertex stage
    const pleatPhase = tube.x.mul(Math.PI * 48).add(tube.y.mul(Math.PI * 12))
    const pleatHeight = pleatPhase.sin().mul(0.0065)
    // Displace vertex along geometry normal
    this.positionNode = positionGeometry.add(normalLocal.mul(pleatHeight))
    // Tracheal bio-venation network: longitudinal veins and fine transverse struts
    const veinLong = opticalLine(tube.y.mul(Math.PI * 16).sin(), 0.12)
    const veinCross = opticalLine(tube.x.mul(Math.PI * 80).sin(), 0.08)
    const venation = veinLong.max(veinCross.mul(0.7))
    // Microscopic cuticular scales revealed at intimate distance
    const microScale = hairline(tube.x.mul(Math.PI * 260).sin(), 0.003).mul(near)
    // Authentic thin-film structural interference in the multi-layer chitin cuticle (n = 1.58)
    const cuticleThickness = float(430)
      .add(pleatHeight.mul(8000))
      .add(venation.mul(90))
    const structuralColor = thinFilm(cuticleThickness, facing, 1.58)
    // Base chitin matrix: deep melanin-infused bronze base beneath the iridescent epicuticle
    const melaninBase = mix(color('#0a1008'), color('#1a260c'), venation)
    const bodyColor = mix(melaninBase, structuralColor, float(0.75).add(venation.mul(0.2)))
    this.colorNode = bodyColor
    this.metalnessNode = float(0.78).sub(venation.mul(0.2))
    this.roughnessNode = float(0.08).add(venation.mul(0.12)).add(microScale.mul(0.05))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.025
    this.sheen = 0.5
    this.sheenColor.set('#ffd700')
    this.sheenRoughness = 0.35
    // Multi-layer iridescence parameters
    this.iridescence = 1
    this.iridescenceIOR = 1.58
    this.iridescenceThicknessNode = cuticleThickness
    // Procedural normal for the corrugated pleats and raised tracheal struts
    const corrugationNormal = proceduralNormal(pleatHeight.add(venation.mul(0.003)), 0.85)
    this.normalNode = corrugationNormal
    // Subtle bio-fluorescence in the tracheal channels, visible under grazing rim light
    const bioFluorescence = mix(color('#00ffa2'), color('#38b6ff'), venation)
      .mul(venation)
      .mul(rim.pow(2))
      .mul(near.mul(0.5).add(0.5))
      .mul(0.7)
    const glancingGold = color('#e6b800').mul(grazing.pow(3)).mul(0.35)
    this.emissiveNode = bioFluorescence.add(glancingGold)
  }
}
