import {attribute, bumpMap, color, float, mix, mx_noise_float, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** The tones of a timber, as sRGB hex strings. */
export type WoodColors = {
  /** plain heartwood between the figure */
  dark: string
  /** where the figure catches the light */
  light: string
  /** the dense latewood of the growth rings */
  ring: string
}

export const walnut: WoodColors = {
  dark: '#2a1910',
  light: '#4f3220',
  ring: '#1b0f09',
}
/** French-polished Cuban mahogany: deep red-brown with a warm, ribbony figure. */
export const mahogany: WoodColors = {
  dark: '#3b140a',
  light: '#73301a',
  ring: '#230805',
}

/**
 * Satin-oiled black walnut joinery, or another timber in the same finish.
 *
 * Geometry supplies the grain through the `woodGrain` attribute: meters along the fibers, meters across them and a per-piece seed. Stiles, rails and bent head rails therefore each show their own grain direction, and no two pieces share the same figure.
 */
export default class WalnutMaterial extends MeshStandardNodeMaterial {
  constructor({colors = walnut, roughness = 0.36}: {
    colors?: WoodColors
    /** the polish where the pores and rings don’t roughen it */
    roughness?: number
  } = {}) {
    super({
      roughness: roughness + 0.06,
      envMapIntensity: 0.6,
    })
    const grain = attribute<'vec3'>('woodGrain', 'vec3')
    const along = grain.x
    const across = grain.y
    const seed = grain.z.mul(37)
    // Slow meander of the growth rings, stretched along the fibers.
    const meander = mx_noise_float(vec3(along.mul(0.9), across.mul(4), seed))
    const ringPhase = across.mul(120).add(meander.mul(8))
    // Thin latewood lines fade to their average before they can shimmer.
    const rings = mix(ringPhase.sin().mul(0.5).add(0.5).pow(4), float(0.27), ringPhase.fwidth().smoothstep(0.8, 2.4))
    const poreCoordinate = vec3(along.mul(5), across.mul(420), seed.add(11))
    const pores = mix(mx_noise_float(poreCoordinate).mul(0.5).add(0.5), float(0.5), across.mul(420).fwidth().smoothstep(0.6, 2))
    const figure = mx_noise_float(vec3(along.mul(1.6), across.mul(9), seed.add(5))).mul(0.5).add(0.5)
    const tone = mx_noise_float(vec3(seed, seed.mul(0.37), 3.1)).mul(0.12).add(1)
    const heartwood = mix(color(colors.dark), color(colors.light), figure)
    this.colorNode = mix(heartwood, color(colors.ring), rings.mul(0.45)).mul(pores.mul(0.22).add(0.89)).mul(tone)
    this.roughnessNode = pores.mul(0.14).add(rings.mul(0.06)).add(roughness)
    this.normalNode = bumpMap(pores.mul(0.6).add(rings.mul(0.4)), float(0.0025))
  }
}
