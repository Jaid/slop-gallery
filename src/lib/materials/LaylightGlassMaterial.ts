import {color, float, min, mix, mx_noise_float, positionWorld, uv, vec2, vec3} from 'three/tsl'
import {MeshBasicNodeMaterial} from 'three/webgpu'

export type LaylightGlassOptions = {
  /** linear brightness of the glass; it has to stay below the gallery’s bloom threshold of 1 */
  brightness?: number
  /**
   * How much a whole glazed field dims toward its frame, 0–1. Measured in the mesh’s UV space, so every plane of a merged
   * geometry gets its own falloff: brightest under the middle of the skylight above it, dimmer where the coffer shades it.
   */
  fieldFalloff?: number
  /** color of the duller patches of the sky’s cloudy variation */
  haze?: string
  /** color of the brighter patches */
  tint?: string
}

/**
 * Frosted panes of a laylight, glowing with the daylight of a skylight above them.
 *
 * Each pane is brightest in its middle and dims a little toward its glazing bars; slow cloudy variation keeps the field from
 * reading as one flat light box. `pane` is the pane size in meters, `origin` the world x/z of any pane corner.
 */
export default class LaylightGlassMaterial extends MeshBasicNodeMaterial {
  constructor(pane: number, origin: readonly [number, number], {brightness = 0.82, fieldFalloff = 0, haze = '#dfe5e6', tint = '#f2f1ea'}: LaylightGlassOptions = {}) {
    super()
    if (!(pane > 0)) {
      throw new RangeError('Laylight panes need a positive size.')
    }
    if (!(brightness > 0 && brightness < 1)) {
      throw new RangeError('Laylight brightness has to stay between 0 and the bloom threshold of 1.')
    }
    if (!(fieldFalloff >= 0 && fieldFalloff <= 1)) {
      throw new RangeError('Laylight field falloff has to be between 0 and 1.')
    }
    const local = vec2(positionWorld.x.sub(origin[0]), positionWorld.z.sub(origin[1])).div(pane).fract()
    const edge = min(min(local.x, local.oneMinus().x), min(local.y, local.oneMinus().y))
    const falloff = edge.smoothstep(0, 0.22).mul(0.1).add(0.9)
    const cloud = mx_noise_float(vec3(positionWorld.x.mul(0.45), positionWorld.z.mul(0.45), 3)).mul(0.5).add(0.5)
    const sky = mix(color(haze), color(tint), cloud.smoothstep(0.25, 0.75))
    let glow = sky.mul(falloff)
    if (fieldFalloff > 0) {
      // Distance to the nearest field edge in UV space, eased so the dimming gathers along the frame instead of a linear ramp.
      const field = uv().sub(0.5).abs().mul(2)
      const rim = field.x.max(field.y)
      glow = glow.mul(rim.smoothstep(0.35, 1).mul(-fieldFalloff).add(1))
    }
    // Below the gallery’s bloom threshold of 1: overcast daylight through frosted glass glows, it does not flare.
    this.colorNode = glow.mul(float(brightness))
  }
}
