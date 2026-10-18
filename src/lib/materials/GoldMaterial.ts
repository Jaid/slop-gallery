import type {Node, Texture} from 'three/webgpu'

import {float, max, mix, mx_fractal_noise_float, mx_noise_float, positionLocal, vec3} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {visibleDetail} from './filters.ts'

type Float = Node<'float'>

/**
 * Normal-incidence reflectance of the gold in linear RGB.
 *
 * Measured pure gold is about (1, 0.77, 0.34). This is a touch deeper, like the 18–22 karat gold of gilding and plated fittings, which keeps the dim reflections of a dark room amber instead of turning khaki. A metal has no diffuse color: everything it shows is this tint applied to the reflection of its surroundings.
 */
export const goldReflectance = [1, 0.7, 0.26] as const
/** Where the polish has dulled: the same gold, slightly browner and darker, as handled metal gets between cleanings. */
const dulledReflectance = [0.8, 0.5, 0.16] as const
const unit = (node: Float) => node.mul(0.5).add(0.5)

/**
 * Lacquered polished gold, entirely procedural and shared by every gilt and golden object of the gallery.
 *
 * The metal tints its reflections with gold’s reflectance and is polished almost to a mirror, so it mirrors its environment in warm gold instead of reading as flat ochre paint. Broad, soft patches where the polish has dulled are a touch darker, browner and blurrier. Fine turning marks run around vertical axes, like on lathe-turned posts, and roughen the highlights in faint rings. A thin clear lacquer on top adds the crisp white glint and the depth of a coated finish.
 *
 * The pattern follows each mesh’s local position in meters, so it moves with grabbed objects instead of swimming over them. The turning marks fade to their average before they get small enough to shimmer.
 */
export default class GoldMaterial extends MeshPhysicalNodeMaterial {
  constructor({environment, environmentIntensity = 1}: {
    /** a dedicated reflection environment instead of the scene’s, e.g. one with bright light sources for crisp highlights */
    environment?: Texture
    environmentIntensity?: number
  } = {}) {
    super({
      envMap: environment ?? null,
      envMapIntensity: environmentIntensity,
      metalness: 1,
      roughness: 0.18,
      clearcoat: 0.25,
      clearcoatRoughness: 0.05,
    })
    this.name = 'Lacquered gold'
    const position = positionLocal
    // Soft, room-scale handling marks: a few large patches per meter.
    const wear = unit(mx_fractal_noise_float(position.mul(1.9), 3)).smoothstep(0.42, 0.82).toVar('goldWear')
    // Lathe-turned rings: fine along the height, stretched around it.
    const footprint = max(position.y.fwidth(), float(1e-5))
    const rings = unit(mx_noise_float(vec3(position.x.mul(6), position.y.mul(260), position.z.mul(6)))).sub(0.5).mul(visibleDetail(footprint, 1 / 260))
    // Larger blotches of the lacquer film, so the clear coat is not a perfect mirror either.
    const film = unit(mx_noise_float(position.mul(7.3).add(11.7)))
    this.colorNode = mix(vec3(...goldReflectance), vec3(...dulledReflectance), wear.mul(0.55))
    this.roughnessNode = float(0.14).add(wear.mul(0.14)).add(rings.mul(0.08))
    this.clearcoatRoughnessNode = float(0.035).add(film.mul(0.05)).add(wear.mul(0.05))
  }
}
