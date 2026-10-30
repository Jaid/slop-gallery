import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Matrix4, Shape} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {openingTop} from '../placement/wallGeometry.ts'
import {openingShape} from './architecture.ts'
import {bendGeometry, curveSegments, sliceAlongX} from './CurvedBoxGeometry.ts'

export type BarredOpeningOptions = {
  /** the heights of the flat iron bands across the bars, over the wall’s foot */
  bands: ReadonlyArray<number>
  /** how far behind the wall’s center line the opening runs on, through the gap to the wall it meets there */
  depth: number
}

/** how far apart the bars stand, at most, along the wall’s center line */
const barSpacing = 0.15
const barRadius = 0.016
const bandHeight = 0.05
const bandThickness = 0.014
/** how deep the iron reaches into the stone around the opening */
const embed = 0.06
/** how far the reveal’s stone reaches past the opening, into the walls on both sides of the gap */
const margin = 0.25

/**
 * The iron bars in an opening through a wall, and the stone reveal that lines the opening on through the gap behind the wall to the wall it meets there, like the apse’s gate and windows through the Oculus’ wall and the Fortress’ behind it.
 * Both are built in the wall’s own frame, bent with it if it curves, and placed with it in world space.
 * The reveal lines the opening from the wall’s center line `depth` meters back, where the other wall’s center line lies; for an opening down to the floor, its sill fills the gap between both floors. The bars stand halfway through it.
 */
export default class BarredOpeningGeometry {
  readonly bars: BufferGeometry
  readonly reveal: BufferGeometry

  constructor(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation' | 'width'>, hole: WallOpening, {bands, depth}: BarredOpeningOptions) {
    const bottom = hole.bottom ?? 0
    const halfWidth = hole.width / 2
    const top = openingTop(hole, hole.u)
    const frame = new Shape
    frame.moveTo(hole.u - halfWidth - margin, bottom - margin)
    frame.lineTo(hole.u + halfWidth + margin, bottom - margin)
    frame.lineTo(hole.u + halfWidth + margin, top + margin)
    frame.lineTo(hole.u - halfWidth - margin, top + margin)
    frame.closePath()
    frame.holes.push(openingShape(hole, 0, bottom))
    const reveal = new ExtrudeGeometry(frame, {
      depth,
      bevelEnabled: false,
      curveSegments: 64,
    })
    reveal.translate(0, 0, -depth)
    // The bars and bands stand halfway back through the reveal.
    const back = -depth / 2
    const count = Math.ceil(hole.width / barSpacing) - 1
    const bars = Array.from({length: count}, (_, i) => {
      const u = hole.u - halfWidth + hole.width * (i + 1) / (count + 1)
      const low = bottom - embed
      const high = openingTop(hole, u) + embed
      const bar = new CylinderGeometry(barRadius, barRadius, high - low, 8)
      return bar.translate(u, (low + high) / 2, back)
    })
    const bandWidth = hole.width + embed * 2
    const iron = [
      ...bars,
      ...bands.map(height => {
        const band = new BoxGeometry(bandWidth, bandHeight, bandThickness, wall.curveRadius ? curveSegments(bandWidth, wall.curveRadius) * 4 : 1)
        return band.translate(hole.u, height, back)
      }),
    ]
    const place = new Matrix4
    place.makeRotationY(wall.rotation).setPosition(...wall.center)
    for (const part of [reveal, ...iron]) {
      if (wall.curveRadius) {
        if (part === reveal) {
          sliceAlongX(part, wall.width / curveSegments(wall.width, wall.curveRadius), -wall.width / 2)
        }
        bendGeometry(part, wall.curveRadius)
      }
      part.applyMatrix4(place)
    }
    this.reveal = mergeParts([reveal])
    this.bars = mergeParts(iron)
  }

  dispose() {
    this.reveal.dispose()
    this.bars.dispose()
  }
}
