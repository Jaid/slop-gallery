import type {Texture} from 'three/webgpu'

import {color, float, mix, normalLocal, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * A sugar-black lacquer field carries saturated candy blocks at two shallow depths. The second layer is sampled along the eye vector, so its color slips beneath the polish while the viewer orbits.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.68)
    this.name = knotData.id
    const {p, view, grazing, near, intimate} = viewerFrame()
    const outerCoordinate = p.mul(3.7)
    const outerCell = outerCoordinate.floor()
    const outerIdentity = cellNoiseVec3(outerCell)
    const outerLocal = outerCoordinate.fract().sub(0.5)
    const outerEdge = outerLocal.x.abs().max(outerLocal.y.abs()).max(outerLocal.z.abs())
    const outerPaneRaw = outerEdge.smoothstep(0.33, 0.39).oneMinus()
    // Differentiate unwrapped coordinates and keep filtering inside the owning cell.
    const outerFilter = outerCoordinate.fwidth().length().mul(1.25)
    const outerPane = outerEdge.smoothstep(0.33, outerFilter.add(0.39).min(0.49)).oneMinus()
    const innerCoordinate = p.sub(view.mul(0.095)).mul(4.65).add(vec3(9.3, 4.1, 13.7))
    const innerCell = innerCoordinate.floor()
    const innerIdentity = cellNoiseVec3(innerCell)
    const innerLocal = innerCoordinate.fract().sub(0.5)
    const innerEdge = innerLocal.x.abs().max(innerLocal.y.abs()).max(innerLocal.z.abs())
    const innerFilter = innerCoordinate.fwidth().length().mul(1.25)
    const innerPane = innerEdge.smoothstep(0.4, innerFilter.add(0.45).min(0.49)).oneMinus().mul(near.mul(0.74).add(0.26))
    const outerBlue = mix(color('#053f9b'), color('#00b8d4'), outerIdentity.x)
    const outerRose = mix(color('#8b0a58'), color('#ed306c'), outerIdentity.y)
    const outerGold = mix(color('#9b3c05'), color('#ffc950'), outerIdentity.z)
    const outerTint = mix(mix(outerBlue, outerRose, outerIdentity.z), outerGold, outerIdentity.x.smoothstep(0.7, 0.86))
    const innerIndigo = mix(color('#2f0b83'), color('#a21caf'), innerIdentity.x)
    const innerCyan = mix(color('#006f85'), color('#20d4c2'), innerIdentity.y)
    const innerTint = mix(innerIndigo, innerCyan, innerIdentity.z)
    const lead = outerPane.oneMinus()
    const leadRaw = outerPaneRaw.oneMinus()
    const blackGlass = mix(color('#000001'), color('#050716'), grazing.mul(0.1))
    const paneColor = mix(outerTint, innerTint, innerPane.mul(0.44))
    this.positionNode = p.add(normalLocal.mul(leadRaw.mul(0.009).sub(outerPaneRaw.mul(0.0018))))
    this.colorNode = mix(blackGlass, paneColor, outerPane.mul(0.94))
    this.metalnessNode = lead.mul(0.84)
    this.roughnessNode = mix(float(0.075), float(0.18), lead).add(grazing.mul(0.02)).clamp(0.045, 0.24)
    this.clearcoat = 0.82
    this.clearcoatNode = outerPane.mul(0.82)
    this.clearcoatRoughness = 0.018
    this.iridescence = 0.22
    this.iridescenceIOR = 1.33
    this.iridescenceNode = outerPane.mul(grazing.pow(1.8)).mul(0.45)
    this.iridescenceThicknessNode = outerIdentity.z.mul(150).add(180)
    const glassNormal = proceduralNormal(lead.mul(0.78).add(outerPane.mul(0.16)).add(innerPane.mul(0.1)), 0.0022)
    this.normalNode = glassNormal
    this.clearcoatNormalNode = glassNormal
    const gleam = glints(glassNormal, 112).mul(outerPane.add(lead.mul(0.25))).mul(near)
    // Each tint is supported only by its own pane, including in the emissive layer.
    const paneGlow = paneColor.mul(outerPane.mul(0.82)).add(innerTint.mul(innerPane.mul(0.18)))
    this.emissiveNode = paneGlow.mul(near.mul(0.72).add(0.26)).add(color('#f7efff').mul(gleam).mul(intimate.mul(0.08).add(0.012)))
  }
}
