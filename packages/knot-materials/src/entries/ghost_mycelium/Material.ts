import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_noise_vec3, normalViewGeometry, time} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import {filament} from '../../lib/filament.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
    const {p, grazing, rim, near, intimate} = viewerFrame()
    // Domain-warped coordinates for branching fungal hyphae cords
    const warp = mx_noise_vec3(p.mul(3.8)).mul(0.35)
    const cordP = p.add(warp)
    // Primary structural hyphal cords
    const primaryNoise = mx_noise_float(cordP.mul(13))
    const hyphaeLine = filament(primaryNoise, 0.024)
    // Micro-hyphae mesh revealed as viewer approaches
    const fineNoise = mx_noise_float(cordP.mul(34).add(warp.mul(2)))
    const microHyphae = filament(fineNoise, 0.014).mul(near.mul(0.7).add(0.3))
    const hyphaeMesh = hyphaeLine.add(microHyphae.mul(0.55)).clamp()
    // Spore nodules along the fungal network
    const spores = cellularPoints(cordP.mul(46), 0.03, 0.19, 0.58)
    // Translucent amber chitin base substrate beneath velvety hyphae
    const amberSubstrate = mix(color('#150d07'), color('#341f0e'), mx_noise_float(p.mul(6)).mul(0.5).add(0.5))
    const hyphaeWhite = mix(color('#e5f5ea'), color('#b2dfcf'), microHyphae)
    this.colorNode = mix(amberSubstrate, hyphaeWhite, hyphaeMesh.mul(0.85))
    this.transmission = 0.58
    this.thickness = 0.52
    this.ior = 1.53
    this.attenuationColor.set('#783c0c')
    this.attenuationDistance = 1.15
    // Velvety hyphal fuzz with intense phosphorescent sheen
    this.sheen = 1
    this.sheenNode = mix(color('#ffffff'), color('#85ffb0'), hyphaeMesh)
    this.sheenRoughness = 0.65
    // Roughness and clearcoat balance
    this.roughnessNode = mix(float(0.12), float(0.68), hyphaeMesh)
    this.clearcoatNode = hyphaeMesh.oneMinus().mul(0.8)
    this.clearcoatRoughness = 0.04
    // Procedural normal: corded fibrous relief
    const cordRelief = hyphaeMesh.mul(0.0032).add(spores.mul(0.002))
    this.normalNode = proceduralNormal(cordRelief, 0.85)
    // Living action potentials: bioluminescent waves traveling through the hyphae
    const wavePhase = cordP.y.mul(16).add(primaryNoise.mul(5)).sub(time.mul(1.8))
    const actionWave = wavePhase.sin().smoothstep(0.62, 0.96)
    // Responsive excitation: accelerated bio-pulses when intimate
    const intimateWave = cordP.x.mul(14).sub(time.mul(2.8)).sin().smoothstep(0.7, 0.98).mul(intimate)
    // Foxfire bioluminescence (cold emerald and turquoise light)
    const foxfireTint = mix(color('#12ff68'), color('#00f0ff'), actionWave.mul(0.5).add(intimateWave.mul(0.5)))
    const hyphaeGlow = foxfireTint
      .mul(hyphaeMesh)
      .mul(actionWave.mul(0.7).add(intimateWave.mul(0.8)).add(0.15))
      .mul(near.mul(0.5).add(0.5))
      .mul(3.2)
    // Spore nodules emit starry phosphorescence
    const sporeGlow = color('#d8ffb8').mul(spores).mul(near.mul(0.7).add(0.3)).mul(3.6)
    // Spore glints
    const sporeNormal = normalViewGeometry.add(warp.mul(0.6)).normalize()
    const sporeSparkle = glints(sporeNormal, 110).mul(spores).mul(near)
    // Atmospheric velvet rim glow
    const rimFoxfire = color('#00ff88').mul(rim.pow(2.4)).mul(grazing).mul(0.3)
    this.emissiveNode = hyphaeGlow
      .add(sporeGlow)
      .add(color('#ffffff').mul(sporeSparkle).mul(1.8))
      .add(rimFoxfire)
  }
}
