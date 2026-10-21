import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import lobbyLunetteRelief, {lunetteInscription, lunettePanelOffsets} from './lobbyLunette.ts'

type Point = readonly [number, number]

/** A flat stroke of the inscription, as a box from one point to the other in the letters’ own plane. */
const stroke = (from: Point, to: Point, width: number, depth: number) => {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  const box = new BoxGeometry(length + width, width, depth)
  // Rotate about the box’s own center, then move it: translating first would swing it around the origin.
  return box.rotateZ(Math.atan2(dy, dx)).translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, depth / 2)
}
/** Merge pieces but keep the result’s bounds, which merging would otherwise discard along with its inputs. */
const bounded = (parts: Array<BufferGeometry>) => {
  const merged = mergeParts(parts)
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}
/** The gallery’s eight-pointed star, beveled, lying in the xy plane. */
const starGeometry = () => {
  const {star} = lobbyLunetteRelief
  const outline = new Shape
  for (let i = 0; i < star.points * 2; i++) {
    const size = i % 2 === 0 ? star.outer : star.inner
    const angle = (i / (star.points * 2) - 0.125) * Math.PI * 2
    outline[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * size, Math.sin(angle) * size)
  }
  outline.closePath()
  return new ExtrudeGeometry(outline, {
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 1,
    depth: star.depth,
  })
}

/**
 * The carved frieze on the Lobby’s north lunette, in the vault’s space.
 *
 * Gilt-framed panels cross the lunette, each with the gallery’s eight-pointed star, and the center one carries the gallery’s
 * name in gilt. The north lunette faces the room along +z, so the carving stands proud that way.
 */
export default class LobbyLunetteReliefGeometry {
  /** the dark fields behind the gilt frames */
  readonly field: BufferGeometry
  readonly gilt: BufferGeometry

  constructor() {
    const {faceZ, fillet, inscription, panel, star, y} = lobbyLunetteRelief
    const front = faceZ + panel.depth
    const field: Array<BufferGeometry> = []
    const gilt: Array<BufferGeometry> = []
    const starTemplate = starGeometry()
    for (const x of lunettePanelOffsets()) {
      const slab = new BoxGeometry(panel.width, panel.height, panel.depth)
      field.push(slab.translate(x, y, faceZ + panel.depth / 2))
      // The fillet frames the panel on all four sides and stands proud of it.
      for (const side of [-1, 1]) {
        const rail = new BoxGeometry(panel.width + fillet.width * 2, fillet.width, fillet.depth)
        gilt.push(rail.translate(x, y + side * (panel.height + fillet.width) / 2, front + fillet.depth / 2))
        const stile = new BoxGeometry(fillet.width, panel.height, fillet.depth)
        gilt.push(stile.translate(x + side * (panel.width + fillet.width) / 2, y, front + fillet.depth / 2))
      }
      const boss = new SphereGeometry(star.outer * 0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
      gilt.push(boss.scale(1, 1, 0.16).translate(x, y, front))
      gilt.push(starTemplate.clone().translate(x, y, front + 0.02))
      const hub = new CylinderGeometry(star.inner * 0.4, star.inner * 0.4, star.depth * 0.5, 14)
      gilt.push(hub.rotateX(Math.PI / 2).translate(x, y, front + star.depth * 0.75))
    }
    starTemplate.dispose()
    const {advance, gap, letters, text} = lunetteInscription
    const unit = inscription.stroke
    const words = text.split(' ')
    const wordWidth = (spelled: string) => spelled.length * advance * unit
    let cursor = -(wordWidth(words[0]) + gap * unit + wordWidth(words[1])) / 2
    const baseline = y - inscription.drop
    const strokes: Array<BufferGeometry> = []
    for (const spelled of words) {
      for (const character of spelled) {
        for (const [x0, y0, x1, y1] of letters[character as keyof typeof letters]) {
          strokes.push(stroke([cursor + x0 * unit, baseline + y0 * inscription.height], [cursor + x1 * unit, baseline + y1 * inscription.height], unit, inscription.depth).translate(0, 0, front))
        }
        cursor += advance * unit
      }
      cursor += gap * unit
    }
    gilt.push(bounded(strokes))
    this.field = bounded(field)
    this.gilt = bounded(gilt)
  }

  dispose() {
    this.field.dispose()
    this.gilt.dispose()
  }
}
