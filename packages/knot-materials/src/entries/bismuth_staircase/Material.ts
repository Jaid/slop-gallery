import type {Texture} from 'three/webgpu'

import {color, float, mx_noise_float, normalLocal, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

const oxideIndex = 2.1
export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
// ---------------------------------------------------------------------
// Bismuth Staircase. Bismuth refuses to freeze smoothly: it grows as a
// hopper crystal, a stack of flat terraces that spiral inward. Each
// terrace is a fresh metal surface, and each grew its own oxide film of
// a slightly different thickness – so every step of the staircase is a
// different color, and the whole thing shifts as you walk past it.
// ---------------------------------------------------------------------
    const {p, facing, grazing} = viewerFrame()
// Hopper growth: the crystal advances in discrete rectilinear terraces.
    const q = p.mul(3.6)
    const chebyshev = q.x.abs().max(q.y.abs()).max(q.z.abs())
    const field = chebyshev.add(mx_noise_float(p.mul(2.4)).mul(0.35))
    const t = field.mul(14)
    const level = t.floor()
    const frac = t.fract()
    const step = frac.smoothstep(0.84, 1)
    const height = level.add(step).sub(7).mul(0.0026)
    this.positionNode = p.add(normalLocal.mul(height))
// Each terrace grew its own oxide film, so each has its own interference color.
    const band = level.sub(level.div(6).floor().mul(6))
    const oxide = band.mul(62).add(140)
// Thin-film interference on the metal's own reflection: bismuth has no diffuse.
    const cosTheta = float(1).sub(facing.mul(facing).oneMinus().div(oxideIndex * oxideIndex)).max(0).sqrt()
    const path = oxide.mul(2).mul(oxideIndex).mul(cosTheta)
    const film = vec3(path.div(680), path.div(530), path.div(440)).mul(TAU).cos().mul(0.5).add(0.5)
    const facet = mx_noise_float(p.mul(34)).mul(0.5).add(0.5)
    const riser = frac.smoothstep(0.88, 1)
    this.colorNode = film.pow(1.9).mul(1.5).clamp().mul(facet.mul(0.12).add(0.94))
    this.metalness = 1
    this.roughnessNode = float(0.05).add(riser.mul(0.2)).add(facet.mul(0.04))
    this.iridescence = 0.6
    this.iridescenceIOR = oxideIndex
    this.iridescenceThicknessNode = oxide
    this.clearcoat = 0.3
    this.clearcoatRoughness = 0.08
    this.normalNode = proceduralNormal(step.mul(1.5).add(facet.mul(0.05)), 0.0022)
    this.clearcoatNormalNode = this.normalNode
    this.aoNode = riser.mul(-0.45).add(1)
    this.emissiveNode = color('#8fd8ff').mul(riser).mul(grazing.pow(2)).mul(0.1)
  }
}
