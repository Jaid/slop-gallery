import type {Texture} from 'three/webgpu'

import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, positionGeometry, positionView, positionViewDirection, time, vec2, vec4} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

// ---------------------------------------------------------------
// A Mexican-fire opal the size of a knotted ring: a deep indigo matrix
// with a dozen overlapping play-of-colour fields, each anchored to a
// different slow rotation so the fire flickers through every hue in
// turn. Black dendrite inclusions are etched across the surface as if
// some ancient fossil were caught in the silica, and from intimate
// range the glow inside brightens until the opal looks lit from
// within.
// ---------------------------------------------------------------
export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    this.envMapIntensity = 0.55
    const p = positionGeometry
    const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
    const viewDir = cameraLocal.sub(p).normalize()
    const facing = positionView.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(1.8)
    const distance = positionView.length()
    const near = distance.smoothstep(1.25, 5.5).oneMinus()
    const intimate = distance.smoothstep(0.8, 2.7).oneMinus()
    // ---- host matrix ----
    // A black opal host with subtle milky veining. The base is a deep
    // cobalt-indigo; the veining is brighter silica.
    const hostRnd = mx_noise_float(p.mul(2.8)).mul(0.5).add(0.5)
    const host = mix(color('#04061a'), color('#161a3d'), hostRnd.mul(0.6))
    const milkyVein = mx_noise_float(p.mul(11)).smoothstep(0.62, 0.78).mul(hostRnd.pow(2))
    const hostWithVeins = mix(host, color('#3b4070'), milkyVein.mul(0.5))
    // ---- dendrite inclusions ----
    // Black MnO2 dendrites: a fractal noise thresholded at the high end
    // gives a feathery branching pattern.
    const dendrite = mx_fractal_noise_float(p.mul(3.6).add(vec2(2.3, 5.1)), 4, 2.1, 0.55)
      .smoothstep(0.42, 0.52)
      .oneMinus()
      .mul(intimate)
    // ---- play-of-colour fields ----
    // Twelve overlapping patches, each a cosine palette over its own
    // slow phase. The patches are gated by cell noise so each lives in
    // its own region of the surface.
    const patchSum = p.x.add(p.y).add(p.z).mul(0.33)
    const patchRnd = mx_noise_float(patchSum.add(0.1)).mul(0.5).add(0.5)
    const patchCentre = patchRnd.fract()
    const localPatch = p.mul(3).fract().sub(patchCentre).add(0.5)
    const patchMask = localPatch.length().smoothstep(0.7, 0.1).oneMinus().clamp()
    const patchSeed = patchRnd.fract().mul(12)
    // The fire phase is a dot product against the view direction plus
    // time and per-patch offset, producing true angular colour shift.
    const firePhase = viewDir.dot(p.sub(vec2(0.5))).mul(8).add(time.mul(0.4)).add(patchSeed)
    const rWave = firePhase.add(0).cos().mul(0.5).add(0.5)
    const gWave = firePhase.add(2.094).cos().mul(0.5).add(0.5)
    const bWave = firePhase.add(4.189).cos().mul(0.5).add(0.5)
    // Per-region iridescence thickness: thin films of different
    // thicknesses in different patches produce different play-of-colour.
    const patchThickness = mix(280, 720, patchRnd.fract())
    const thickness = patchThickness.add(grazing.mul(180)).add(rim.mul(120))
    // ---- assembly ----
    this.colorNode = hostWithVeins
    this.metalness = 0.05
    this.roughnessNode = float(0.14).add(milkyVein.mul(0.18))
    this.sheen = 0.35
    this.sheenColor.set('#c0a8ff')
    this.sheenRoughness = 0.4
    this.transmission = 0.2
    this.thickness = 0.45
    this.ior = 1.46
    this.attenuationColor.set('#0a0820')
    this.attenuationDistance = 0.6
    this.iridescence = 1
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessNode = thickness
    this.normalNode = proceduralNormal(milkyVein.mul(0.0015).add(hostRnd.mul(0.0004)), 0.7)
    // ---- emissive ----
    // Three independent play-of-colour fields: warm, cool, and a magenta
    // accent. They cross-fade through the cosine palette as the fire
    // phase advances. From intimate range the glow inside brightens until
    // the opal looks lit from within.
    const innerFire = color('#ffba50').mul(rWave.pow(2))
      .add(color('#9bff80').mul(gWave.pow(2)))
      .add(color('#7e7dff').mul(bWave.pow(2)))
    const innerGlow = innerFire
      .mul(patchMask.mul(0.85).add(0.15))
      .mul(near.mul(0.6).add(0.4))
      .mul(intimate.mul(2).add(0.6))
    const dendriteDarkness = float(1).sub(dendrite)
    const haloGlow = mix(color('#b9a8ff'), color('#f5d8a8'), facing)
      .mul(rim)
      .mul(near.mul(0.4).add(0.3))
      .mul(0.25)
    this.emissiveNode = innerGlow.add(haloGlow)
    this.colorNode = (mix as unknown as (a: any, b: any, t: any) => typeof hostWithVeins)(
      this.colorNode,
      color('#020210'),
      dendriteDarkness,
    )
    bWave
  }
}
