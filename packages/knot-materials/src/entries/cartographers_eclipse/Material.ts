import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, positionGeometry, positionView, time, vec3, vec4} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

/**
 * A pocket astrolabe. The knot is engraved with the constellations of a single imagined sky: gunmetal blue-black, fine gold filaments for the star lines, and emissive pin-points for the stars themselves. The star points live in the original (parallax-stable) surface so they do not drift as you orbit; only the nebular gas behind them shifts. Each star twinkles on its own clock; nearby stars share a slow drift so the constellations seem to gently breathe.
 */
export default class extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.45)
    this.name = knotData.id
    this.envMapIntensity = 0.55
    const p = positionGeometry
    const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
    const viewDir = cameraLocal.sub(p).normalize()
    const distance = positionView.length()
    const near = distance.smoothstep(1.25, 5.5).oneMinus()
    const intimate = distance.smoothstep(0.8, 2.7).oneMinus()
    // ---- substrate ----
    // A very dark gunmetal blue with a faint brushed structure, so that
    // the gold lines and stars have something to read against.
    const brush = mx_noise_float(p.mul(38)).mul(0.5).add(0.5)
    const sky = mix(color('#0a0c1a'), color('#1a1f38'), brush.mul(0.6))
    const deep = color('#02030a')
    // ---- star field ----
    // Each star lives at a Voronoi cell centre, with a deterministic
    // per-cell brightness. Stars are anchored to the surface (no parallax)
    // and twinkle on their own clock; near stars share a slow drift so
    // the constellations gently breathe.
    const cellScale = 13
    const cellSum = p.mul(cellScale).floor().x.add(p.mul(cellScale).floor().y).add(p.mul(cellScale).floor().z).mul(0.31)
    const cellRnd = mx_noise_float(cellSum.add(7.1))
    const cellCentre = p.mul(cellScale).fract().sub(0.5)
    const starR = cellRnd.fract().mul(0.7).add(0.04)
    const cellDist = cellCentre.length()
    const starMask = cellDist.smoothstep(starR, starR.mul(0.5)).oneMinus().clamp()
    const cellBrightness = cellRnd.fract().pow(3).add(0.1)
    const twinkle = time.mul(cellRnd.fract().mul(8).add(1)).sin().mul(0.45).add(0.6)
    const starEnergy = starMask.mul(cellBrightness).mul(twinkle)
    // ---- nebular gas ----
    // A drifting haze behind the stars, with parallax along the view
    // direction so it shifts as you circle. Two stacked fractal noise
    // bands, one near and one far.
    const drift = vec3(time.mul(0.04), time.mul(-0.025), time.mul(0.02))
    const nearHaze = mx_noise_float(p.add(viewDir.mul(0.04)).add(drift))
      .mul(mx_noise_float(p.add(viewDir.mul(0.04)).add(drift).mul(2.3)).add(0.5))
    const farHaze = mx_noise_float(p.add(viewDir.mul(-0.08)).add(drift.mul(0.6)))
      .mul(mx_noise_float(p.add(viewDir.mul(-0.08)).add(drift.mul(0.6)).mul(2.7)).add(0.5))
    const haze = nearHaze.mul(0.5).add(0.5).mul(farHaze.mul(0.5).add(0.5))
    // ---- constellation lines ----
    // Each star cell knows which neighbour cell to link to (by hashing),
    // so we get a different gold network per area. The lines are drawn by
    // ribbonising a slow sinusoid in a per-cell direction.
    const neighbourRnd = mx_noise_float(vec3(cellSum.add(1), cellSum.add(2), cellSum.add(3)))
    const linkDir = vec3(
      neighbourRnd.sub(0.5),
      neighbourRnd.fract().sub(0.5),
      neighbourRnd.mul(2).fract().sub(0.5),
    )
    const linkDirN = linkDir.div(linkDir.dot(linkDir).sqrt().max(0.001))
    const linkPhase = cellCentre.dot(linkDirN)
    const linkField = linkPhase.add(time.mul(0.05).mul(neighbourRnd.fract().sub(0.5)))
    const linkCore = linkField.abs().smoothstep(0.05, 0.0001).oneMinus()
    const linkMask = linkCore.mul(starMask).mul(neighbourRnd.fract().pow(2))
    // ---- colour composition ----
    const nebulaColour = mix(color('#1a1240'), color('#522670'), haze)
    const baseColour = mix(deep, sky, distance.sub(1).mul(0.5).add(0.4).clamp()).add(nebulaColour.mul(near.mul(0.55).add(0.3).mul(0.55)))
    this.colorNode = baseColour
    this.metalness = 0.55
    this.roughness = 0.32
    this.normalNode = proceduralNormal(brush.mul(0.0004).add(haze.mul(0.0009)), 0.7)
    // ---- emissive ----
    const starGlow = color('#ffe8c2').mul(starEnergy).mul(intimate.mul(2).add(0.5))
    const linkGlow = color('#d8a445').mul(linkMask).mul(near.mul(0.5).add(0.4)).mul(4)
    const nebulaGlow = nebulaColour.mul(haze.mul(0.5).add(0.2)).mul(near.mul(0.4).add(0.25))
    this.emissiveNode = starGlow.add(linkGlow).add(nebulaGlow)
  }
}
