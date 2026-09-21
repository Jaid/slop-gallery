import type {Texture} from 'three/webgpu'

import {
  color,
  float,
  normalViewGeometry,
  refract,
  vec3,
} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {opalDiffractionStratum} from './util.ts'

export default class BlackOpalMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85) // Crisp reflections of studio softboxes on optical-grade silica
    this.name = knotData.id
    const {p, view, grazing, near, intimate} = viewerFrame()
    // 1. Snell's Law Refraction into the silica cabochon (n = 1.45)
    const normal = normalViewGeometry
    const refractedRay = refract(view.negate(), normal, float(1 / 1.45)).normalize()
    // 2. Three representative studio illumination directions
    const lampA = vec3(0.35, 0.78, 0.52).normalize()
    const lampB = vec3(-0.62, 0.28, 0.73).normalize()
    const lampC = vec3(0.1, -0.35, 0.93).normalize()
    // Half-vectors between refracted view ray and lamps
    const halfA = lampA.add(view).normalize()
    const halfB = lampB.add(view).normalize()
    const halfC = lampC.add(view).normalize()
    // 3. Multi-Strata 3D Volumetric Bragg Diffraction
    // Stratum 1: Shallow Harlequin flagstone layer (depth = 0.014)
    const pStratum1 = p.add(refractedRay.mul(0.014))
    const fireLayer1 = opalDiffractionStratum(pStratum1, halfA, halfB, halfC, 14, 1)
    // Stratum 2: Deeper fine-grain Harlequin layer (depth = 0.032, Beer-Lambert potch absorption = 0.65)
    const pStratum2 = p.add(refractedRay.mul(0.032))
    const fireLayer2 = opalDiffractionStratum(pStratum2, halfA, halfB, halfC, 24, 0.65)
    // 4. Pinfire Opal: high-frequency sparkling stardust points
    const pinCoord = pStratum1.mul(70)
    const pinMask = cellularPoints(pinCoord, 0.03, 0.16, 0.72)
    const pinFire = vec3(1, 0.2, 0.5).mul(pinMask).mul(intimate.mul(0.8).add(0.4))
    // 5. Quartz micro-crystallites that glint under gallery lamps
    const quartzSparkle = glints(normalViewGeometry, 85).mul(0.4).mul(intimate)
    // Ultra-deep N1 body tone: pitch-black obsidian/potch matrix
    this.colorNode = color('#010103')
    this.metalness = 0
    this.roughness = 0.04
    // Flawless, mirror-smooth polished cabochon clearcoat
    this.clearcoat = 1
    this.clearcoatRoughness = 0.008
    this.ior = 1.45 // Natural amorphous hydrated silica
    // Pure additive Bragg diffraction emission
    // Flashes ignite with blinding spectral fire while the rest remains pitch-black N1
    this.emissiveNode = fireLayer1
      .add(fireLayer2)
      .mul(near.mul(0.4).add(0.9))
      .mul(5.5)
      .add(pinFire.mul(3.2))
      .add(color('#ffffff').mul(quartzSparkle))
      .add(color('#050814').mul(grazing.pow(3)).mul(0.15))
  }
}
