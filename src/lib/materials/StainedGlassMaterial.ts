import {atan, fract, mix, mx_noise_float, positionLocal, select, vec3} from 'three/tsl'
import {Color, MeshBasicNodeMaterial} from 'three/webgpu'

import {line} from './filters.ts'

export type StainedGlassOptions = {
  /** linear brightness of the daylight coming through; even the palest glass stays below the gallery’s bloom threshold of 1 */
  brightness?: number
  /** center of the rose in the mesh’s local x/y, where its panels face ±z */
  center: readonly [number, number]
  /** radius of the small rings between the spokes near the rim */
  foil: number
  /** radius of the stone hub in the middle */
  hub: number
  /** radius of the glazed opening */
  radius: number
  /** number of spokes, which split the rose into as many petals */
  spokes: number
}

/**
 * Colored glass of a rose window, glowing with the daylight behind it.
 *
 * The pattern is laid out in polar coordinates around the rose’s center: ruby and sapphire petals alternate between the spokes
 * around a golden ring at the hub, each petal with a paler lancet in its middle, and the small rings at the rim are glazed in
 * emerald and amber.
 * Lead cames outline every piece. Each piece’s color varies a little, like hand-blown glass.
 */
export default class StainedGlassMaterial extends MeshBasicNodeMaterial {
  constructor({brightness = 1.25, center, foil, hub, radius, spokes}: StainedGlassOptions) {
    super()
    if (!(brightness > 0 && brightness < 1.3)) {
      throw new RangeError('Stained glass brightness has to keep its palest glass below the bloom threshold of 1.')
    }
    if (!(radius > hub && hub > 0 && foil > 0 && Number.isInteger(spokes) && spokes >= 3)) {
      throw new RangeError('A rose window needs a hub inside its radius, a positive foil and at least three spokes.')
    }
    const x = positionLocal.x.sub(center[0])
    const y = positionLocal.y.sub(center[1])
    const r = x.mul(x).add(y.mul(y)).sqrt()
    const turn = atan(y, x).div(Math.PI * 2).add(0.5)
    const sector = turn.mul(spokes)
    // 0 on a spoke, 0.5 halfway between two
    const across = fract(sector)
    const index = sector.floor()
    const odd = index.sub(index.div(2).floor().mul(2))
    const ring = radius - foil
    // Foils sit halfway between two spokes, touching the rim.
    const angle = sector.floor().add(0.5).div(spokes).sub(0.5).mul(Math.PI * 2)
    const foilDistance = vec3(x.sub(angle.cos().mul(ring)), y.sub(angle.sin().mul(ring)), 0).length()
    const inFoil = foilDistance.lessThan(foil)
    const rgb = (hex: string) => {
      const {r: red, g: green, b: blueChannel} = new Color(hex)
      return vec3(red, green, blueChannel)
    }
    const collarRadius = hub * 1.55
    // A lancet in the middle of every petal: an ellipse along the radius, as a signed distance in meters.
    const lancetCenter = (collarRadius + ring - foil) / 2
    const lancetLength = (ring - foil - collarRadius) / 2 * 0.8
    const lancetWidth = Math.min(0.2, lancetCenter * Math.PI / spokes * 0.45)
    const tangential = across.sub(0.5).mul(r).mul(Math.PI * 2 / spokes)
    const lancet = vec3(tangential.div(lancetWidth), r.sub(lancetCenter).div(lancetLength), 0).length().sub(1).mul(lancetWidth)
    const blue = odd.greaterThan(0.5)
    const petal = select(lancet.lessThan(0), select(blue, rgb('#7da6e6'), rgb('#e8794f')), select(blue, rgb('#1f3f9e'), rgb('#a01f35')))
    const collar = r.lessThan(collarRadius)
    const foilGlass = select(blue, rgb('#2f8a52'), rgb('#d99a2e'))
    const pieces = select(inFoil, foilGlass, select(collar, rgb('#e2b84a'), petal))
    // Every piece is blown separately: its own tint, and a faint ripple across it.
    const blow = mx_noise_float(vec3(index.mul(3.1), lancet.sign().add(inFoil.select(3, 0)), 7)).mul(0.18).add(1)
    const ripple = mx_noise_float(vec3(x.mul(14), y.mul(14), 2)).mul(0.06).add(1)
    const glass = pieces.mul(blow).mul(ripple)
    // Lead cames around the collar, the lancets and the foils.
    const lead = line(r.sub(collarRadius), 0.012)
      .max(line(lancet, 0.012))
      .max(line(foilDistance.sub(foil), 0.012))
    this.colorNode = mix(glass, rgb('#151310'), lead.clamp(0, 1)).mul(brightness)
  }
}
