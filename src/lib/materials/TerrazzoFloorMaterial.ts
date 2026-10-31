import type {Node} from 'three/webgpu'

import {color, float, hash, max, min, mix, mx_noise_float, normalWorldGeometry, positionWorld, select, vec2, vec3} from 'three/tsl'

import {heightNormal, inside, visibleDetail} from './filters.ts'
import FloorMaterial from './FloorMaterial.ts'

/** One mix of terrazzo: the color of the cement binder and the marble chips scattered through it, as sRGB hex strings. */
export type TerrazzoMix = {
  binder: string
  /** the chips’ colors, drawn evenly at random, so a color listed twice shows twice as often */
  chips: ReadonlyArray<string>
}
export type TerrazzoFloorOptions = {
  /** the mix of the border along the walls, if any; see `inset` */
  border?: TerrazzoMix
  /** the room’s middle in world x/z and its size between its walls’ center lines, which the border is measured from */
  center: readonly [number, number]
  field: TerrazzoMix
  /** how far from the walls’ center lines the field begins and the border ends */
  inset?: number
  /** whether the polished floor mirrors the room (heavy mode) */
  reflections?: boolean
  seed?: number
  size: readonly [number, number]
}

type Float = Node<'float'>

/** Warm Venetian terrazzo: an ivory binder full of white, black, ochre, carnelian and gray-green chips. */
export const venetianTerrazzo: TerrazzoMix = {
  binder: '#d7ccb7',
  chips: ['#f2ede3', '#1f1c1b', '#c99a4b', '#9d3b2c', '#7e8a79', '#8e8780', '#f2ede3', '#e0d5c0'],
}

/** Dark terrazzo for a border: a near-black binder with white, carnelian and ochre chips. */
export const blackTerrazzo: TerrazzoMix = {
  binder: '#26211f',
  chips: ['#ece6da', '#9d3b2c', '#c99a4b', '#ece6da', '#565250', '#b8ad98'],
}

/** The chips come in two sizes, each scattered over cells of its own size, in meters, one chip per cell. */
const chipCells = {
  coarse: 0.11,
  fine: 0.045,
} as const
/**
 * Which chip of a layer lies nearest to the point, in cells of `cell` meters over the world x/z `point`: its signed distance in radii of the chip, negative inside it, and a random pick for its color.
 * Every cell holds one chip, an irregular shard: an ellipse of random size, stretch and turn whose outline wavers round a few corners. The nearest of the nine cells around the point wins.
 */
function chipLayer(point: Node<'vec2'>, cell: number, seed: number, name: string) {
  const scaled = point.div(cell).toVar(`${name}Scaled`)
  const base = scaled.floor().toVar(`${name}Cell`)
  let nearest: Float = float(10)
  let pick: Float = float(0)
  for (const dx of [-1, 0, 1]) {
    for (const dz of [-1, 0, 1]) {
      const id = base.add(vec2(dx, dz))
      // Hashes need non-negative seeds below 2²⁴; the offset keeps every cell of a ±500 m floor positive.
      const key = id.x.mul(1021).add(id.y).add(900_013 + seed * 7919)
      const random = (stream: number) => hash(key.add(stream * 1_048_573))
      const center = id.add(vec2(random(1), random(2)).mul(0.8).add(0.1))
      const local = scaled.sub(center)
      const angle = random(3).mul(Math.PI * 2)
      const turned = vec2(local.x.mul(angle.cos()).add(local.y.mul(angle.sin())), local.y.mul(angle.cos()).sub(local.x.mul(angle.sin())))
      const stretch = random(4).mul(0.45).add(0.55)
      const radius = random(5).mul(0.2).add(0.2)
      const corners = random(6).mul(3).add(4).floor()
      const waver = turned.x.atan(turned.y).mul(corners).add(random(7).mul(Math.PI * 2)).sin().mul(0.12).add(1)
      const distance = vec2(turned.x, turned.y.div(stretch)).length().div(radius.mul(waver)).sub(1)
      const closer = distance.lessThan(nearest)
      pick = select(closer, random(8), pick)
      nearest = select(closer, distance, nearest)
    }
  }
  return {
    distance: nearest.toVar(`${name}Distance`),
    pick: pick.toVar(`${name}Pick`),
  }
}
/** The chip color of the mix that a pick between 0 and 1 draws. */
function chipColor({chips}: TerrazzoMix, pick: Float) {
  let result: Node<'color'> = color(chips[0])
  for (const [index, chip] of chips.entries()) {
    if (index) {
      result = select(pick.greaterThanEqual(index / chips.length), color(chip), result)
    }
  }
  return result
}

/**
 * Polished terrazzo, mapped by world position so the pattern stays put however the floor is split into slabs: marble chips of two sizes ground flush in a cement binder, a field of one mix within a border of another along the walls.
 *
 * Every chip is an irregular shard with a color of its own. In heavy mode the polish mirrors the room softly, bent a little by the waviness of a ground floor. Chips smaller than a pixel fade to their average before they could shimmer.
 */
export default class TerrazzoFloorMaterial extends FloorMaterial {
  constructor({border, center, field, inset = 0, reflections = true, seed = 0, size}: TerrazzoFloorOptions) {
    if (!(size[0] > 0 && size[1] > 0) || inset < 0) {
      throw new RangeError('A terrazzo floor needs a positive size and a border inset of at least zero.')
    }
    const point = positionWorld.xz.toVar('terrazzoPoint')
    const footprint = max(positionWorld.x.fwidth(), positionWorld.z.fwidth()).toVar('terrazzoFootprint')
    const coarse = chipLayer(point, chipCells.coarse, seed, 'terrazzoCoarse')
    const fine = chipLayer(point, chipCells.fine, seed + 1, 'terrazzoFine')
    // Chips cover the binder; seen from far off, each layer fades to a wash of its average color.
    const coverage = (layer: ReturnType<typeof chipLayer>, cell: number) => mix(float(0.3), inside(layer.distance), visibleDetail(footprint, cell * 0.6))
    const coarseCoverage = coverage(coarse, chipCells.coarse).toVar('terrazzoCoarseCoverage')
    const fineCoverage = coverage(fine, chipCells.fine).toVar('terrazzoFineCoverage')
    // The border runs along the walls, as far in as the inset; the field fills the rest.
    const toWall = min(float(size[0] / 2).sub(point.x.sub(center[0]).abs()), float(size[1] / 2).sub(point.y.sub(center[1]).abs()))
    const inBorder = border ? inside(toWall.sub(inset)).toVar('terrazzoBorder') : float(0)
    const mottle = mx_noise_float(vec3(point.mul(1.3), seed + 3)).mul(0.04).add(1)
    const shade = (blend: TerrazzoMix) => {
      const stone = mix(color(blend.binder).mul(mottle), chipColor(blend, fine.pick), fineCoverage)
      return mix(stone, chipColor(blend, coarse.pick), coarseCoverage)
    }
    const top = normalWorldGeometry.y.step(0.5)
    const finish = reflections ? 0.2 : 0.4
    super(null, {
      color: '#ffffff',
      roughness: finish,
      reflection: reflections ? {
        strength: 0.06,
        grazingStrength: 0.3,
        loss: 2.5,
        mask: top,
      } : undefined,
    })
    const surface = border ? mix(shade(field), shade(border), inBorder) : shade(field)
    const sawn = color(field.binder).mul(0.7)
    this.colorNode = mix(sawn, surface, top)
    // Ground flush, the chips polish a shade smoother than the binder.
    this.roughnessNode = float(finish).add(0.05).sub(max(coarseCoverage, fineCoverage).mul(0.06))
    // A ground floor is never quite flat.
    const waviness = mx_noise_float(vec3(point.mul(3), seed + 5)).mul(0.00015).mul(visibleDetail(footprint, 0.05))
    this.normalNode = heightNormal(waviness.mul(top))
  }
}
