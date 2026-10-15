import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, time, uv, vec3} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import {hairline} from '../../lib/hairline.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    // 95% water: ultra-translucent, gelatinous, and ghostly
    super(environment, 0.95)
    this.transmission = 0.96
    this.thickness = 0.9
    this.ior = 1.33
    this.dispersion = 0.42
    this.attenuationColor.set('#0a4250')
    this.attenuationDistance = 1.6
    this.name = knotData.id
    const tube = uv()
    const {p, view, facing, rim, near, intimate} = viewerFrame()
    // 8 longitudinal ctene comb rows running along the knot
    const combAngle = tube.y.mul(Math.PI * 16)
    const combRibbon = opticalLine(combAngle.sin(), 0.12)
    // Metachronal wave traveling continuously along the knot length
    const waveSpeed = time.mul(2.5)
    const combPhase = tube.x.mul(Math.PI * 44).sub(waveSpeed)
    const ciliaPlates = combPhase.cos().smoothstep(0.15, 0.92)
    const combActive = combRibbon.mul(ciliaPlates)
    // Physical diffraction grating: cilia plates scatter ambient light into traveling rainbow spectra
    const diffractionShift = combPhase.mul(0.35)
      .add(view.dot(normalLocal).mul(3.5))
      .add(facing.mul(2))
    const rainbow = spectralColor(diffractionShift)
    // Micro-cilia bristles revealed on intimate approach
    const ciliaFringe = hairline(tube.x.mul(Math.PI * 360).sub(waveSpeed.mul(2.2)), 0.003)
      .mul(combRibbon)
      .mul(near)
    // Deep interior neural bioluminescence (scattered from core outward)
    const neuralPhase = tube.x.mul(Math.PI * 8).sub(time.mul(0.9)).add(mx_noise_float(p.mul(3.5)).mul(2.2))
    const neuralPulse = neuralPhase.sin().smoothstep(0.6, 0.98)
    const synapticSparks = cellularPoints(p.mul(45).add(vec3(0, time.mul(0.3), 0)), 0.02, 0.15, 0.65).mul(intimate)
    // Cilia plate normal perturbations
    const combBump = proceduralNormal(combActive.mul(0.003).add(ciliaFringe.mul(0.0008)), 0.6)
    // Pale, crystal-clear gelatin volume albedo (ensures pristine water transmission without darkening)
    this.colorNode = mix(color('#b5ecf5'), color('#dcf8ff'), mx_noise_float(p.mul(4)).mul(0.5).add(0.5))
    this.roughnessNode = float(0.02).add(combActive.mul(0.12))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.015
    this.normalNode = combBump
    // Bioluminescent & diffraction emissions
    const diffractionGlow = rainbow.mul(combActive).mul(2.6)
    const neuralGlow = mix(color('#00ffbb'), color('#2450ff'), neuralPhase.cos().mul(0.5).add(0.5))
      .mul(neuralPulse)
      .mul(near.mul(0.6).add(0.4))
      .mul(1.1)
    const sparkGlow = color('#d8ffff').mul(synapticSparks).mul(3.2)
    const rimAura = color('#08a5bf').mul(rim.pow(2)).mul(0.5)
    const fringeGlow = color('#f0ffff').mul(ciliaFringe).mul(1.5)
    this.emissiveNode = diffractionGlow
      .add(neuralGlow)
      .add(sparkGlow)
      .add(fringeGlow)
      .add(rimAura)
  }
}
