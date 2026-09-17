import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalViewGeometry, uv} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cellularPoints} from '../../lib/cellularPoints.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
/**
             * 3. ELYTRA IRIDESCENCE
             * Biomimetic jewel scarab carapace (*Chrysina limbata*).
             * Ultra-vivid constructive thin-film interference shifting through emerald, sapphire, royal amethyst, and bronze.
             * Longitudinally brushed diffraction grating normals and embedded crystalline platelets that sparkle fiercely.
             */
    const {p, grazing, near} = viewerFrame()
    const tube = uv()
    this.iridescence = 1
    this.iridescenceIOR = 1.76
    // Structural micro-rib thickness oscillation (interferes at 370nm - 560nm)
    const microRibs = tube.y.mul(160).add(tube.x.mul(16)).sin().mul(0.5).add(0.5)
    this.iridescenceThicknessNode = microRibs.mul(190).add(370)
    // Carapace body: deep viridian jade transitioning to midnight pitch
    this.colorNode = mix(color('#003623'), color('#01120b'), grazing.pow(1.3))
    this.metalnessNode = float(0.86)
    this.roughnessNode = float(0.12)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    // Velveteen micro-fiber sheen backscatter
    this.sheen = 0.95
    this.sheenNode = mix(color('#ffd166'), color('#e040fb'), grazing.pow(1.5))
    this.sheenRoughness = 0.22
    // Sub-micron longitudinal diffraction grooves
    const groove = tube.x.mul(640).sin().mul(0.002)
    this.normalNode = proceduralNormal(groove.add(mx_noise_float(p.mul(8)).mul(0.015)), 0.001)
    // Embedded crystalline micro-sparkle platelets
    const q = p.mul(95)
    const sparkleRnd = cellNoiseVec3(q)
    const sparkleNormal = normalViewGeometry.add(sparkleRnd.mul(2).sub(1).mul(0.35)).normalize()
    const sparkleGlint = glints(sparkleNormal, 120)
    // Per-platelet normals only contribute inside compact inclusions, never across a whole cell.
    const sparkleMask = cellularPoints(q, 0.07, 0.24, 0.3)
    this.emissiveNode = mix(color('#00ffaa'), color('#ff00aa'), grazing.pow(2)).mul(sparkleGlint).mul(sparkleMask).mul(2.5).mul(near.mul(0.6).add(0.5))
  }
}
