import type {WallOpening} from '#src/lib/gallery/walls.ts'
import type {MarbleStyle} from '../marble/marble.ts'
import type {BoiseriePalette} from './paint.ts'
import type {Node} from 'three/webgpu'

import {abs, color, float, max, mix, normalGeometry, positionLocal, select, vec2} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {wallOpeningTrim} from '#src/lib/gallery/architectureDimensions.ts'

import {inside, line} from '../filters.ts'
import {calacatta, marble} from '../marble/marble.ts'
import {gilt, paintedPlaster, slateBoiserie} from './paint.ts'

export type BoiserieTrimOptions = {
  /** height of the baseboard, whose top 6 cm cap is gilded */
  baseboardHeight?: number
  /** the wall’s doorways, whose surrounds and plinths are carved from marble */
  holes?: ReadonlyArray<WallOpening>
  /** the stone of the doorway surrounds */
  marble?: MarbleStyle
  palette?: BoiseriePalette
  /** the wall’s height, which places the cornice */
  wallHeight: number
}

type Float = Node<'float'>

/** height of the plinth blocks at the foot of a classic doorway surround */
const plinthHeight = 0.4
/** how far a plinth block reaches beyond the surround’s outer edge, as `createArchitectureGeometry` builds it */
const plinthOverhang = 0.065
/** width of the gilt bead along a doorway surround’s outer edge */
const surroundBead = 0.028
/** Signed distance from a wall point to the outline of an opening, negative inside, as the CSG cutters shape it. */
const openingDistance = (point: Node<'vec2'>, hole: WallOpening): Float => {
  const radius = hole.width / 2
  const x = point.x.sub(hole.u)
  if (hole.profile === 'arch') {
    const spring = hole.height - radius
    const below = point.y.lessThan(spring)
    const side = x.abs().sub(radius)
    const arc = vec2(x, point.y.sub(spring)).length().sub(radius)
    return select(below, side, arc)
  }
  const q = vec2(x.abs().sub(radius), point.y.sub(hole.height))
  return q.max(0).length().add(q.x.max(q.y).min(0))
}

/**
 * The trim of a painted, gilded wall: deep-painted baseboards with a gilt cap, a cornice whose lower band is gilded, and honed marble doorway surrounds edged by a gilt bead.
 *
 * Meant for the trim and cornice meshes of one wall, in its local coordinates (x along the wall from its center, y up from its floor, +z into the room).
 */
export default class BoiserieTrimMaterial extends MeshStandardNodeMaterial {
  constructor({baseboardHeight = 0.44, holes = [], marble: stone = calacatta, palette = slateBoiserie, wallHeight}: BoiserieTrimOptions) {
    super({
      roughness: 0.6,
      metalness: 0,
      envMapIntensity: 1,
    })
    if (!(wallHeight > 1) || !(baseboardHeight > 0.06)) {
      throw new RangeError('Boiserie trim needs a wall taller than 1 m and a baseboard taller than its 6 cm cap.')
    }
    const u = positionLocal.x.toVar('trimU')
    const v = positionLocal.y.toVar('trimV')
    const depth = positionLocal.z.toVar('trimDepth')
    const point = vec2(u, v)
    const n = normalGeometry
    const footprint = max(max(u.fwidth(), v.fwidth()), depth.fwidth()).toVar('trimFootprint')
    // The surrounds’ stone is mapped onto whichever plane a face lies in.
    const facingRoom = abs(n.z).greaterThan(0.5)
    const facingAlong = abs(n.x).greaterThan(0.5)
    const stoneU = select(facingRoom, u, select(facingAlong, depth, u))
    const stoneV = select(facingRoom.or(facingAlong), v, depth)
    let surround: Float = float(0)
    let bead: Float = float(0)
    for (const hole of holes) {
      const distance = openingDistance(point, hole)
      // The surround runs around the opening; the plinths stand beside its foot.
      const inSurround = inside(distance.sub(wallOpeningTrim + 0.002))
      const inPlinth = hole.bottom ? float(0) : inside(u.sub(hole.u).abs().sub(hole.width / 2 + wallOpeningTrim + plinthOverhang + 0.002)).mul(inside(v.sub(plinthHeight + 0.002)))
      surround = surround.max(inSurround.max(inPlinth))
      bead = bead.max(line(distance.sub(wallOpeningTrim - surroundBead / 2), surroundBead / 2).mul(inPlinth.oneMinus()).mul(v.greaterThan(plinthHeight).select(float(1), float(0))))
    }
    const surroundShare = surround.toVar('trimSurround')
    const stoneColor = marble({
      footprint,
      name: 'surroundMarble',
      seed: 17,
      style: stone,
      u: stoneU,
      v: stoneV,
    }).color
    // The gilt cap of the baseboard, and the cornice’s lower band.
    const cap = inside(float(baseboardHeight - 0.06).sub(v)).mul(inside(v.sub(baseboardHeight + 0.001)))
    const corniceBand = inside(float(wallHeight - 0.47).sub(v)).mul(inside(v.sub(wallHeight - 0.37)))
    const giltShare = mix(cap.max(corniceBand), bead, surroundShare).toVar('trimGilt')
    const plaster = paintedPlaster({
      footprint,
      seed: 5,
      u,
      v: v.add(depth),
    })
    // Baseboards are a shade deeper than the wall; the cornice matches the wall paint.
    const paint = mix(color(palette.paintDeep), color(palette.paint), v.step(2)).mul(plaster.shade)
    let albedo = mix(paint, stoneColor, surroundShare)
    albedo = mix(albedo, gilt({
      palette,
      u,
      v,
    }), giltShare)
    this.colorNode = albedo
    this.metalnessNode = giltShare.mul(0.55)
    this.roughnessNode = mix(mix(float(0.62), float(0.22), surroundShare), float(0.28), giltShare)
  }
}
