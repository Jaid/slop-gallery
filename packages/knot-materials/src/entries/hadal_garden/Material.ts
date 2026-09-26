import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_float, mx_fractal_noise_float, positionGeometry, time, vec3} from 'three/tsl'

import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {cellularPoints} from '../../lib/cellularPoints.ts'
import {filteredRibbon} from '../../lib/filteredRibbon.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** A membrane dredged from the lightless deep, still alive. A nerve net ripples with traveling cold fire and photophores breathe in private rhythms, each one blazing when the viewer meets it face to face. Along the silhouette the flesh glows like backlit jelly; close up the hide resolves into papillae and a finer vein lattice. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.6)
    this.name = knotData.id
    const p = positionGeometry
    const {facing, rim, near, intimate} = viewerFrame()
    const marbling = mx_fractal_noise_float(p.mul(3.1), 4, 2.1, 0.55).mul(0.5).add(0.5)
    const flesh = mix(color('#01030a'), color('#0f2038'), marbling.mul(0.8))
    const vein = filteredRibbon(cellularBoundary(p.mul(3.2)), 0.035)
    const veinFine = filteredRibbon(cellularBoundary(p.mul(8.5)), 0.016).mul(near)
    const arc = p.x.add(p.y.mul(0.6)).add(p.z.mul(0.8))
    const wave = arc.mul(TAU * 1.5).sub(time.mul(Math.PI * 2)).sin().mul(0.5).add(0.5).pow(3)
    const waveBack = arc.mul(TAU * 2.5).add(time.mul(Math.PI * 3)).sin().mul(0.5).add(0.5).pow(3).mul(0.65)
    const nerve = wave.add(waveBack).mul(vein.add(veinFine.mul(0.8))).clamp()
    const organCell = p.mul(5.5)
    const organ = cellularPoints(organCell, 0.045, 0.16, 0.55)
    const organId = mx_cell_noise_float(organCell.floor())
    const organHue = mx_cell_noise_float(organCell.floor().add(7.3))
    const organRate = organId.mul(2).add(1).floor()
    const breath = time.mul(Math.PI).mul(organRate).add(organId.mul(TAU)).sin().mul(0.5).add(0.5).pow(3)
    const organColor = mix(mix(color('#3ef2ff'), color('#8f6bff'), organHue.smoothstep(0.5, 0.56)), color('#ff5fa8'), organHue.smoothstep(0.8, 0.86))
    const organGlow = organ.mul(breath).mul(facing.pow(1.6)).mul(2.3)
    const papilla = cellularPoints(p.mul(26), 0.05, 0.2, 0.2)
    const relief = vein.mul(-0.35).add(veinFine.mul(-0.2)).add(papilla.mul(0.45)).add(marbling.mul(0.15)).mul(intimate.add(near).clamp())
    this.colorNode = flesh
    this.metalness = 0.05
    this.roughnessNode = marbling.mul(0.15).add(0.28)
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.07
    this.sheenNode = color('#16324a').mul(0.5)
    this.sheenRoughnessNode = float(0.35)
    this.aoNode = marbling.mul(0.2).add(0.8)
    this.normalNode = proceduralNormal(relief, 0.0018)
    this.emissiveNode = color('#39e8ff').mul(nerve).mul(near.mul(0.5).add(0.6)).mul(1.7)
      .add(organColor.mul(organGlow))
      .add(color('#1d8a9a').mul(rim.pow(2.2)).mul(1.8))
      .add(vec3(marbling).mul(color('#0d3a52')).mul(intimate).mul(0.3))
  }
}
