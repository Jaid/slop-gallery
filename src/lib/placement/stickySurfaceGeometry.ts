import type {Wall, WallOpening} from './wallGeometry.ts'

import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

import {wallFace} from '../gallery/architectureDimensions.ts'
import {curveSegments} from '../gallery/CurvedBoxGeometry.ts'
import {openingBottom, openingTop, wallPosition} from './wallGeometry.ts'

/** how far in front of a wall’s plaster the surface lies, so the two never fight over depth */
const lift = 0.01
/** the widest column under or over the curved edge of an arch or a round opening, in meters */
const arcStep = 0.05
/** how many columns at least follow the curved edge of an arch or a round opening, however narrow */
const arcColumns = 32
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/**
 * The faces of the walls that artworks can hang on, every wall that isn’t `sticky: false`, in world space and just in front of their plaster: raked along with sloping walls, bent round curved ones and with every opening and reservation left out, since nothing can hang over them.
 */
export default function stickySurfaceGeometry(walls: ReadonlyArray<Wall>) {
  const positions: Array<number> = []
  const indices: Array<number> = []
  const vertex = (wall: Wall, u: number, y: number) => {
    positions.push(...wallPosition(wall, u, wall.center[1] + y + u * (wall.slope ?? 0), wallFace + lift))
    return positions.length / 3 - 1
  }
  for (const wall of walls) {
    if (wall.sticky === false) {
      continue
    }
    const cutouts = [...wall.holes ?? [], ...wall.reservations ?? []]
    for (const [from, to] of wallColumns(wall, cutouts)) {
      const middle = (from + to) / 2
      const crossing = cutouts.filter(cutout => Math.abs(middle - cutout.u) < cutout.width / 2).toSorted((a, b) => openingBottom(a, middle) - openingBottom(b, middle))
      const left = solidSpans(wall, crossing, from)
      const right = solidSpans(wall, crossing, to)
      for (const [index, [leftBottom, leftTop]] of left.entries()) {
        const [rightBottom, rightTop] = right[index]
        if (leftTop - leftBottom < 1e-6 && rightTop - rightBottom < 1e-6) {
          continue
        }
        // Counterclockwise seen from the room, so the front faces out of the wall.
        const corners = [vertex(wall, from, leftBottom), vertex(wall, to, rightBottom), vertex(wall, to, rightTop), vertex(wall, from, leftTop)]
        indices.push(corners[0], corners[1], corners[2], corners[0], corners[2], corners[3])
      }
    }
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
/** The columns, from and to along the wall, that split it where an opening or a reservation begins or ends, finely enough to follow arches, round openings and curved walls. */
function wallColumns(wall: Wall, cutouts: ReadonlyArray<WallOpening>) {
  const half = wall.width / 2
  const edges = new Set([-half, half])
  for (const cutout of cutouts) {
    for (const side of [-1, 1]) {
      edges.add(clamp(cutout.u + side * cutout.width / 2, -half, half))
    }
  }
  const sorted = [...edges].toSorted((a, b) => a - b)
  const bendStep = wall.curveRadius ? wall.width / curveSegments(wall.width, wall.curveRadius) : Infinity
  const columns: Array<readonly [number, number]> = []
  for (const [index, from] of sorted.slice(0, -1).entries()) {
    const to = sorted[index + 1]
    if (to - from < 1e-6) {
      continue
    }
    const middle = (from + to) / 2
    const arcSteps = cutouts.filter(cutout => cutout.profile !== 'rectangle' && Math.abs(middle - cutout.u) < cutout.width / 2).map(cutout => Math.min(arcStep, cutout.width / arcColumns))
    const step = Math.min(bendStep, ...arcSteps)
    const count = Number.isFinite(step) ? Math.ceil((to - from) / step) : 1
    for (let column = 0; column < count; column++) {
      columns.push([from + (to - from) * column / count, from + (to - from) * (column + 1) / count])
    }
  }
  return columns
}
/** The stretches of a wall at `u` along it, from and to over its foot, that `cutouts`, sorted from the lowest up, leave solid; always one more than there are cutouts, some maybe empty. */
function solidSpans(wall: Wall, cutouts: ReadonlyArray<WallOpening>, u: number) {
  const spans: Array<readonly [number, number]> = []
  let floor = 0
  for (const cutout of cutouts) {
    // At a cutout’s side the column ends right where it begins, so it reads the cutout’s outline there, a hair inside, where rounding can’t put it beside the cutout.
    const reach = cutout.width / 2 - 1e-9
    const along = clamp(u, cutout.u - reach, cutout.u + reach)
    const bottom = clamp(openingBottom(cutout, along), 0, wall.height)
    spans.push([floor, Math.max(floor, bottom)])
    floor = Math.max(floor, bottom, clamp(openingTop(cutout, along), 0, wall.height))
  }
  spans.push([floor, wall.height])
  return spans
}
