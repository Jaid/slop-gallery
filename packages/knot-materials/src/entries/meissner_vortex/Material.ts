import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_atan2, mx_noise_float, time, uv, vec2} from 'three/tsl'

import {hexLattice} from '../../candidates/gemini_flash/lib/hexLattice.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const tube = uv()
    const {p, rim, near} = viewerFrame()
    // Hexagonal Abrikosov flux lattice mapped along the knot surface
    const gridScale = vec2(36, 12)
    const {local, edgeDist, radius} = hexLattice(tube.mul(gridScale))
    // Vortex core: order parameter collapses at r = 0
    const core = radius.smoothstep(0.04, 0.16).oneMinus()
    const hexFacet = edgeDist.smoothstep(0.01, 0.08).oneMinus()
    // Quantum phase angle around the vortex core
    const theta = mx_atan2(local.y, local.x.add(0.00001)) as unknown as Node<'float'>
    // Concentric Meissner quantum phase rings expanding from each vortex
    const phaseRings = radius.mul(Math.PI * 18).sub(time.mul(1.8)).add(theta.mul(0.5)).sin()
      .smoothstep(0.2, 0.85)
      .mul(radius.smoothstep(0.08, 0.45).oneMinus())
    // Substrate: dark crystalline cuprate ceramic with cleavage steps
    const ceramicNoise = mx_noise_float(p.mul(28)).mul(0.12).add(0.88)
    const ceramicBase = mix(color('#06070d'), color('#121626'), ceramicNoise)
    const currentStreamline = mix(color('#0a2e38'), color('#135a66'), phaseRings)
    this.colorNode = mix(ceramicBase, currentStreamline, core.mul(0.3).add(phaseRings.mul(0.4)))
    this.metalnessNode = float(0.82).sub(core.mul(0.5))
    this.roughnessNode = float(0.18).sub(core.mul(0.1)).add(hexFacet.mul(0.08))
    this.clearcoat = 0.95
    this.clearcoatRoughness = 0.03
    // Vortex depression and circulating current normal
    const vortexNormal = proceduralNormal(core.mul(-0.004).add(phaseRings.mul(0.0015)), 0.8)
    this.normalNode = vortexNormal
    // Superconducting emissions:
    // 1. Vortex core singularity: piercing electric cyan to ultraviolet
    const coreEmission = mix(color('#00f0ff'), color('#a040ff'), core.pow(2))
      .mul(core)
      .mul(near.mul(0.5).add(0.7))
      .mul(2.8)
    // 2. Meissner shielding currents: pulsing quantum phase ripples
    const ringEmission = color('#00ffcc')
      .mul(phaseRings)
      .mul(near.mul(0.6).add(0.4))
      .mul(0.8)
    // 3. Lattice boundary luminescence
    const latticeAura = color('#483090').mul(hexFacet).mul(0.35)
    // 4. Diamagnetic rim shielding
    const diamagneticRim = color('#00bfff').mul(rim.pow(2.5)).mul(0.5)
    this.emissiveNode = coreEmission
      .add(ringEmission)
      .add(latticeAura)
      .add(diamagneticRim)
  }
}
