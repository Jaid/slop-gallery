import {atan, color, float, mix, mx_fractal_noise_float, mx_noise_float, sin, uv, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {inside, visibleDetail} from './filters.ts'

/** Sunray grooves of the guilloché around the center. */
const guillocheRays = 120

/**
 * Enameled clock dial for a disc with the UVs of a `CircleGeometry` of `radius`: a band of glossy lapis enamel from `chapter`
 * outward, flecked with gilt like the stone’s pyrite, around a warm ivory center engraved with a sunray guilloché.
 *
 * The engraving fades to its average before its grooves get finer than a few pixels, so the dial never shimmers from the floor.
 */
export default class ClockDialMaterial extends MeshStandardNodeMaterial {
  constructor({chapter, radius}: {
    /** where the lapis band begins, in meters from the center */
    chapter: number
    radius: number
  }) {
    if (!(radius > 0) || !(chapter > 0 && chapter < radius)) {
      throw new RangeError('ClockDialMaterial needs a positive radius and a chapter ring inside it.')
    }
    super({
      roughness: 0.3,
      metalness: 0,
    })
    this.name = 'Enameled clock dial'
    const position = uv().sub(0.5).mul(radius * 2).toVar('dialPosition')
    const distance = position.length()
    const footprint = position.fwidth().length().max(1e-5)
    const band = inside(float(chapter).sub(distance))
    // Lapis: a deep ultramarine clouded with lighter veins and sparse gilt flecks.
    const clouds = mx_fractal_noise_float(vec3(position.mul(1.6), 0.5), 3).mul(0.5).add(0.5)
    const lapis = mix(color('#1f3b86'), color('#3a62b4'), clouds.smoothstep(0.25, 0.85))
    const fleck = mx_noise_float(vec3(position.mul(34), 3.1)).smoothstep(0.6, 0.72).mul(visibleDetail(footprint, 1 / 34))
    // Ivory: sunray grooves around the center, and a faint warm mottle.
    const angularFootprint = footprint.div(distance.max(1e-3)).mul(guillocheRays)
    const grooves = sin(atan(position.y, position.x).mul(guillocheRays)).mul(0.5).add(0.5).mul(visibleDetail(angularFootprint, Math.PI * 2))
    const mottle = mx_noise_float(vec3(position.mul(2.2), 7.3))
    const ivory = color('#efe4c8').mul(mottle.mul(0.02).add(1)).mul(grooves.mul(-0.07).add(1))
    const enamel = mix(ivory, lapis, band)
    this.colorNode = mix(enamel, color('#e1b061'), fleck.mul(band))
    this.metalnessNode = fleck.mul(band)
    this.roughnessNode = mix(grooves.mul(0.1).add(0.34), clouds.mul(0.06).add(0.16), band)
  }
}
