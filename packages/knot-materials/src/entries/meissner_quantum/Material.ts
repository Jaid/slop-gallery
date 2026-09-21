import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_float, mx_noise_float, time, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class MeissnerQuantumMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.2)
    this.name = knotData.id
    const {p, grazing, rim, near, intimate} = viewerFrame()
    // 3D Abrikosov flux vortex pinning lattice
    const latticeCoord = p.mul(16)
    const cellId = latticeCoord.floor()
    const cellRnd = cellNoiseVec3(cellId)
    const pinCenter = cellRnd.mul(0.25).add(0.375)
    const rel = latticeCoord.fract().sub(pinCenter)
    const r = rel.xy.length()
    // Derivative footprint for clean anti-aliasing of vortex singularities
    const footprint = r.fwidth().max(0.0001)
    // Quantized flux core (singularity where superconductivity is quenched)
    const core = r.smoothstep(footprint.mul(1.2).add(0.04), 0.18).oneMinus()
    // Circulating supercurrent rings around each pinned vortex
    const supercurrent = r.smoothstep(0.04, 0.14).mul(r.smoothstep(0.16, 0.46).oneMinus())
    const phasePhase = r.mul(38).sub(time.mul(2.2)).add(cellRnd.z.mul(6.28))
    const phaseRings = opticalBands(phasePhase).mul(supercurrent)
    // Circulating supercurrent vector field driving surface anisotropy
    const currentTangent = vec2(rel.y.negate(), rel.x).div(r.max(0.001))
    // Quantum phase slips: stochastic flux hopping events between pinning sites
    const slipStutter = mx_cell_noise_float(
      vec3(time.mul(14).floor().add(0.5), cellRnd.x.mul(11.3), cellRnd.y.mul(7.7)),
    ).smoothstep(0.72, 0.76)
    const fluxHop = slipStutter.mul(core).mul(intimate)
    // Ceramic cuprate background grain
    const cuprateGrain = mx_noise_float(p.mul(42)).mul(0.5).add(0.5)
    const ceramicBase = mix(color('#0a0e14'), color('#1a2332'), cuprateGrain.mul(0.2))
    // Total Meissner diamagnetic expulsion: metallic mirror luster at grazing angles
    const meissnerMirror = grazing.pow(1.8)
    this.colorNode = mix(ceramicBase, color('#00d2ff'), core.mul(0.4))
    this.metalnessNode = mix(float(0.15), float(0.96), meissnerMirror.max(supercurrent.mul(0.4)))
    this.roughnessNode = mix(float(0.36), float(0.04), meissnerMirror.max(core.mul(0.8)))
    // Anisotropic reflections swirling around each vortex core
    this.anisotropy = 0.85
    this.anisotropyNode = currentTangent.mul(supercurrent.mul(0.75))
    // Clearcoat ceramic glaze
    this.clearcoat = 0.85
    this.clearcoatRoughness = 0.035
    // Magnetic flux tube depression in the surface normal
    const fluxIndent = core.mul(-0.0028).add(phaseRings.mul(0.0008))
    this.normalNode = proceduralNormal(fluxIndent, 0.7)
    // Radiation: cyan vortex singularities + concentric phase rings + quantum avalanche sparks
    const coreTint = mix(color('#00f6ff'), color('#7b2cbf'), r.mul(2.8).clamp())
    const coreEmission = coreTint.mul(core).mul(near.mul(0.4).add(0.6)).mul(3.6)
    const ringEmission = color('#00b4d8').mul(phaseRings).mul(1.2)
    const sparkEmission = color('#ffffff').mul(fluxHop).mul(4.8)
    const meissnerRim = color('#00e5ff').mul(rim.pow(3)).mul(0.35)
    this.emissiveNode = coreEmission
      .add(ringEmission)
      .add(sparkEmission)
      .add(meissnerRim)
  }
}
