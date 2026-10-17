import type {WallRectangle} from '#src/lib/gallery/dine.ts'
import type {MarbleStyle} from '../marble/marble.ts'
import type {BoiseriePalette} from './paint.ts'
import type {Node} from 'three/webgpu'

import {abs, color, float, max, mix, normalGeometry, positionLocal, select, vec2} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal, inside, line, visibleDetail} from '../filters.ts'
import {calacatta, marble} from '../marble/marble.ts'
import {gilt, paintedPlaster, slateBoiserie} from './paint.ts'

export type BoiserieWallOptions = {
  /** the stone that lines the reveals of the wall’s openings, matching the trim’s doorway surrounds */
  marble?: MarbleStyle
  /** depth the moldings stand proud of the plaster, in meters, for shading only */
  moldingDepth?: number
  /** half the width of a panel molding, in meters */
  moldingHalfWidth?: number
  palette?: BoiseriePalette
  /** rectangles framed by a gilt molding */
  panels: ReadonlyArray<WallRectangle>
  /** gilt chair rail bands; the wall below them is painted a shade deeper */
  rails?: ReadonlyArray<WallRectangle>
  seed?: number
}

type Float = Node<'float'>

/** depth of the chair rail, in meters, for shading only */
const railDepth = 0.012
/** distance of the inner fillet from the panel outline, and its half-width, in meters */
const innerFilletInset = 0.085
const innerFilletHalfWidth = 0.004
/** Signed distance from a wall point to the outline of a rectangle, negative inside. */
const rectangleDistance = (point: Node<'vec2'>, {u, v}: WallRectangle) => {
  const center = vec2((u[0] + u[1]) / 2, (v[0] + v[1]) / 2)
  const half = vec2((u[1] - u[0]) / 2, (v[1] - v[0]) / 2)
  const q = point.sub(center).abs().sub(half)
  return q.max(0).length().add(q.x.max(q.y).min(0))
}

/**
 * Painted plaster with gilt boiserie: picture-frame moldings and a painted chair rail, drawn in the shader instead of modeled.
 *
 * Meant for one wall’s surface mesh, whose local coordinates have x along the wall from its center, y up from its floor and +z facing into the room; panels and rails are given in those coordinates. Only the room-facing side is decorated; the reveals of its openings are lined with marble. The moldings are shaded with a rounded profile and darken the plaster right beside them a little, as their shadow would; far away they fade to their average instead of shimmering.
 */
export default class BoiserieWallMaterial extends MeshStandardNodeMaterial {
  constructor({marble: stone = calacatta, moldingDepth = 0.014, moldingHalfWidth = 0.026, palette = slateBoiserie, panels, rails = [], seed = 0}: BoiserieWallOptions) {
    super({
      roughness: 0.8,
      metalness: 0,
      envMapIntensity: 1,
    })
    if (!(moldingHalfWidth > 0) || !(moldingDepth >= 0)) {
      throw new RangeError('Boiserie moldings need a positive width and a non-negative depth.')
    }
    for (const {u, v} of [...panels, ...rails]) {
      if (!(u[1] > u[0] && v[1] > v[0])) {
        throw new RangeError('Boiserie rectangles need a positive size.')
      }
    }
    const u = positionLocal.x.toVar('boiserieU')
    const v = positionLocal.y.toVar('boiserieV')
    const point = vec2(u, v)
    const footprint = max(u.fwidth(), v.fwidth()).toVar('boiserieFootprint')
    const front = normalGeometry.z.greaterThan(0.5)
    const plaster = paintedPlaster({
      footprint,
      seed,
      u,
      v,
    })
    // Distance to the nearest panel outline; the molding is a band around it.
    let outline: Float = float(1e3)
    let panelField: Float = float(1e3)
    for (const panel of panels) {
      const distance = rectangleDistance(point, panel)
      outline = outline.min(distance.abs())
      panelField = panelField.min(distance)
    }
    const outlineDistance = outline.toVar('boiserieOutline')
    // A slim gilt fillet runs around the inside of each panel, a hand’s width in from its molding.
    const fillet = line(panelField.add(innerFilletInset), innerFilletHalfWidth).toVar('boiserieFillet')
    const molding = line(outlineDistance, moldingHalfWidth).toVar('boiserieMolding')
    // A rounded ovolo, with a fine quirk cut along its crown.
    const across = outlineDistance.div(moldingHalfWidth).clamp(0, 1)
    const quirk = line(outlineDistance.sub(moldingHalfWidth * 0.35), 0.0015)
    const moldingHeight = across.smoothstep(0, 1).oneMinus().mul(moldingDepth).sub(quirk.mul(moldingDepth * 0.25)).add(fillet.mul(0.002))
    // Baked light on the profile: the upper slopes and the crown catch the lamps, the hollows toward the wall fall into shade.
    const towardRoom = across.oneMinus()
    const profileShade = towardRoom.smoothstep(0, 0.6).mul(0.5).add(0.5).add(quirk.mul(-0.25))
    // The plaster beside a molding lies in its soft shadow.
    const shadow = outlineDistance.smoothstep(moldingHalfWidth, moldingHalfWidth + 0.035).oneMinus().mul(molding.oneMinus())
    // The chair rail: a gilt bullnose, lit from above like the moldings, over a dado painted a shade deeper.
    let railField: Float = float(1e3)
    for (const rail of rails) {
      railField = railField.min(rectangleDistance(point, rail))
    }
    const railTop = Math.max(...rails.map(rail => rail.v[1]))
    const railBottom = Math.min(...rails.map(rail => rail.v[0]))
    const railDistance = railField.toVar('boiserieRail')
    const rail = inside(railDistance)
    // 0 at the rail’s foot, 1 at its top edge.
    const railAcross = v.sub(railBottom).div(Math.max(railTop - railBottom, 1e-3)).clamp(0, 1)
    const railShade = railAcross.smoothstep(0.1, 0.75).mul(0.55).add(0.45).sub(line(railAcross.sub(0.3), 0.04).mul(0.2))
    const dado = rails.length ? inside(v.sub(railBottom)).mul(rail.oneMinus()) : float(0)
    const railHeight = railDistance.negate().smoothstep(0, 0.014).mul(railDepth)
    // The rail casts a soft shadow on the dado below it.
    const railShadow = float(railBottom).sub(v).smoothstep(0, 0.04).oneMinus().mul(dado)
    const relief = visibleDetail(footprint, 0.02)
    const isFront = front.select(float(1), float(0))
    const giltShare = molding.max(rail).max(fillet).mul(isFront).toVar('boiserieGilt')
    const paint = mix(color(palette.paint), color(palette.paintDeep), dado.mul(isFront).mul(0.55)).mul(plaster.shade)
    const occlusion = shadow.mul(0.16).max(railShadow.mul(0.3)).mul(isFront).oneMinus()
    const giltShade = mix(mix(float(1), profileShade, molding), railShade, rail)
    const albedo = mix(paint.mul(occlusion), gilt({
      palette,
      u,
      v,
    }).mul(mix(float(1), giltShade, relief)), giltShare)
    // Faces that look along the wall or up and down are the reveals of its doorways: they continue the marble of the surrounds.
    // Blended by a 0/1 factor rather than picked with `select`, whose branches cannot share shader variables.
    const reveal = abs(normalGeometry.z).step(0.5).oneMinus()
    const revealStone = marble({
      footprint: max(footprint, positionLocal.z.fwidth()),
      name: 'revealMarble',
      seed: 17,
      style: stone,
      u: select(abs(normalGeometry.x).greaterThan(0.5), positionLocal.z, u),
      v: select(abs(normalGeometry.y).greaterThan(0.5), positionLocal.z, v),
    }).color
    this.colorNode = mix(albedo, revealStone, reveal)
    this.metalnessNode = giltShare.mul(0.55)
    this.roughnessNode = mix(mix(float(0.8), float(0.28), giltShare), float(0.22), reveal)
    const height = front.select(moldingHeight.mul(molding).max(railHeight).mul(relief), float(0)).add(plaster.height)
    this.normalNode = heightNormal(height)
  }
}
