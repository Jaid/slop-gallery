import type {Node, Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, positionViewDirection, vec3} from 'three/tsl'

import {braggDiffraction} from '../../candidates/gemini_flash/lib/braggDiffraction.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {cellularPoints} from '../../lib/cellularPoints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.transmission = 0.88
    this.thickness = 0.82
    this.ior = 1.45
    this.dispersion = 0.35
    this.attenuationColor.set('#0a1d26')
    this.attenuationDistance = 1.2
    this.name = knotData.id
    const {p, grazing, rim, near, intimate} = viewerFrame()
    // 3D mosaic harlequin domain partitioning
    const domainCoord = p.mul(18)
    const domainRnd = cellNoiseVec3(domainCoord.floor())
    const boundary = cellularBoundary(domainCoord)
    const tileEdge = boundary.smoothstep(0.02, 0.08).oneMinus()
    // Randomized internal crystal lattice normal for each domain
    const latticeNormal = domainRnd.sub(0.5).mul(2).normalize()
    // Three studio light directions to test the Bragg diffraction condition
    const lamps = [
      vec3(0.35, 0.78, 0.52).normalize(),
      vec3(-0.62, 0.28, 0.73).normalize(),
      vec3(0.1, -0.35, 0.93).normalize(),
    ]
    // Domain sphere spacing determines the dominant diffraction wavelength
    const dSpacing = domainRnd.x.mul(0.4).add(0.7)
    // Sum Bragg diffraction flashes across studio lighting vectors
    let braggFlash: Node<'vec3'> = vec3(0)
    for (const lamp of lamps) {
      const halfVector = lamp.add(positionViewDirection).normalize()
      const flash = braggDiffraction(latticeNormal, halfVector, dSpacing, 45)
      braggFlash = braggFlash.add(flash)
    }
    // Pinfire micro-sparkles inside the domains, awakened on close approach
    const pinfire = cellularPoints(p.mul(65), 0.03, 0.18, 0.6).mul(near)
    // Dark ironstone matrix host beneath milky translucent silica cap
    const matrixColor = mix(color('#05070a'), color('#141c22'), mx_noise_float(p.mul(8)).mul(0.5).add(0.5))
    const opalescentHaze = color('#80c8e8')
    this.colorNode = mix(matrixColor, opalescentHaze, grazing.pow(2).mul(0.35))
    this.roughness = 0.025
    this.clearcoat = 1
    this.clearcoatRoughness = 0.015
    // Subtle cabochon polished normal with hairline boundary depression
    const cabochonNormal = proceduralNormal(tileEdge.mul(-0.0008), 0.5)
    this.normalNode = cabochonNormal
    // Emissive play-of-color:
    // 1. Bragg diffraction flashes: intense pure spectral fires
    const spectralFires = braggFlash
      .mul(tileEdge.oneMinus())
      .mul(near.mul(0.5).add(0.7))
      .mul(2.5)
    // 2. Micro-pinfire sparkles: vibrant points of colored light
    const pinfireColor = mix(color('#ff2060'), color('#00f0a0'), domainRnd.y)
    const pinfireGlow = pinfireColor.mul(pinfire).mul(intimate).mul(3)
    // 3. Rayleigh scattering rim opalescence
    const rayleighRim = color('#7ec8f0').mul(rim.pow(2.2)).mul(0.3)
    this.emissiveNode = spectralFires
      .add(pinfireGlow)
      .add(rayleighRim)
  }
}
