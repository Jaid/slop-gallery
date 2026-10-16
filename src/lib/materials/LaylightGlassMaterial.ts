import {color, float, min, mix, mx_noise_float, positionWorld, vec2, vec3} from 'three/tsl'
import {MeshBasicNodeMaterial} from 'three/webgpu'

/**
 * Frosted panes of a laylight, glowing with the daylight of a skylight above them.
 *
 * Each pane is brightest in its middle and dims a little toward its glazing bars; slow cloudy variation keeps the field from
 * reading as one flat light box. `pane` is the pane size in meters, `origin` the world x/z of any pane corner.
 */
export default class LaylightGlassMaterial extends MeshBasicNodeMaterial {
  constructor(pane: number, origin: readonly [number, number], tint = '#f2f1ea') {
    super()
    if (!(pane > 0)) {
      throw new RangeError('Laylight panes need a positive size.')
    }
    const local = vec2(positionWorld.x.sub(origin[0]), positionWorld.z.sub(origin[1])).div(pane).fract()
    const edge = min(min(local.x, local.oneMinus().x), min(local.y, local.oneMinus().y))
    const falloff = edge.smoothstep(0, 0.22).mul(0.1).add(0.9)
    const cloud = mx_noise_float(vec3(positionWorld.x.mul(0.45), positionWorld.z.mul(0.45), 3)).mul(0.5).add(0.5)
    const sky = mix(color('#dfe5e6'), color(tint), cloud.smoothstep(0.25, 0.75))
    // Below the gallery’s bloom threshold of 1: overcast daylight through frosted glass glows, it does not flare.
    this.colorNode = sky.mul(falloff).mul(float(0.82))
  }
}
