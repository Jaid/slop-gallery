import type {Texture} from 'three/webgpu'

import {float, luminance, mix, mx_fractal_noise_float, mx_noise_float, positionGeometry, vec3} from 'three/tsl'

import {environmentReflection} from '../../candidates/claude_sonnet/lib/environmentReflection.ts'
import {liquidNormal} from '../../candidates/claude_sonnet/lib/liquidNormal.ts'
import {loopDrift, loopPhase} from '../../candidates/claude_sonnet/lib/loopClock.ts'
import {thinFilm} from '../../candidates/claude_sonnet/lib/spectrum.ts'
import {cosinePalette} from '../../lib/cosinePalette.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Refractive index of a light petroleum film floating on water. */
const filmIndex = 1.42
/** A film of oil spread across black water. Its thickness is a domain-warped flow field that drains toward the bottom of the knot, and the reflected color is integrated across the whole visible spectrum, exactly like a real interference film: thin skins flash through gold, magenta and cyan, thick ones wash toward pastel, and where the film is thinner than a wavelength it vanishes into black. The optical path shortens as the surface turns away, so the whole slick re-colors as you walk around it. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    const p = positionGeometry
    const {facing, grazing, near, intimate} = viewerFrame()
// A slow, closed boil keeps the slick alive without drifting off its two-second loop.
    const warp = mx_fractal_noise_float(loopDrift(p.mul(1.6), 0.3), 3, 2, 0.5)
    const flowRaw = mx_fractal_noise_float(p.mul(2.4).add(warp.mul(0.9)).add(loopDrift(p.mul(0.5), 0.22, 1)), 4, 2.05, 0.5)
// Fractal noise rarely reaches its extremes; stretch it so the film really spans from bare water to thick oil.
    const flow = flowRaw.mul(1.35).add(0.5).clamp()
    const veins = mx_noise_float(p.mul(5.2).add(flow.mul(2.6)).add(11)).mul(0.5).add(0.5)
    const fine = mx_noise_float(loopDrift(p.mul(13).add(flow.mul(3)), 0.16, 1)).mul(near.mul(0.7).add(0.3))
    const drain = float(0.55).sub(p.y).mul(300)
    const thickness = flow.smoothstep(0.12, 0.86).mul(700).add(veins.mul(140)).add(drain).add(fine.mul(38)).add(loopPhase.add(p.y.mul(6)).sin().mul(18))
// Pockets where the film thins toward zero read as inky black between the colors.
    const dry = flow.smoothstep(0.08, 0.26).oneMinus().mul(0.95)
    const wet = thickness.mul(mix(float(1), float(0.08), dry)).max(6)
    const normal = liquidNormal(near.add(intimate), 0.55, loopPhase, loopPhase.mul(2))
    this.normalNode = normal
    const cosRefracted = facing.pow2().oneMinus().div(filmIndex ** 2).oneMinus().sqrt()
    const spectrum = thinFilm(wet.mul(filmIndex).mul(cosRefracted))
// Real slicks are more saturated than a plain spectral integral once the eye adapts; push chroma away from the mean.
    const film = mix(vec3(luminance(spectrum)), spectrum, 2.6).max(0)
    const fresnel = grazing.pow(5).mul(0.9).add(0.1)
    const sky = environmentReflection(environment, normal, 0.03).pow(2).mul(1.1).add(0.05)
    this.colorNode = vec3(0.004, 0.005, 0.008)
    this.metalness = 0
    this.roughness = 0.035
    this.specularIntensity = 0.32
    this.envMapIntensity = 0.55
    const aurora = cosinePalette(flow.mul(1.3).add(grazing.mul(0.45)).add(loopPhase.div(Math.PI * 2)), [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67])
    this.emissiveNode = film.mul(sky).mul(fresnel.mul(2.6).add(0.4))
      .add(aurora.mul(grazing.pow(3)).mul(0.055).mul(dry.oneMinus()))
  }
}
