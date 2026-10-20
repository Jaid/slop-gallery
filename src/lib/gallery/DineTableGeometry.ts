import {BoxGeometry, BufferGeometry, Float32BufferAttribute, LatheGeometry, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import dineTable, {dineTableStretchers} from './dineTable.ts'

/** A closed candlestick standing on the tabletop: foot, baluster and cup. */
export function candlestickGeometry() {
  const {candlestickHeight, candlestickRadius, top} = dineTable
  return lathe([
    [candlestickRadius * 1.75, 0],
    [candlestickRadius * 1.75, 0.01],
    [candlestickRadius * 0.9, 0.03],
    [candlestickRadius * 0.32, 0.075],
    [candlestickRadius * 0.28, candlestickHeight * 0.42],
    [candlestickRadius * 0.66, candlestickHeight * 0.58],
    [candlestickRadius * 0.28, candlestickHeight * 0.72],
    [candlestickRadius * 0.4, candlestickHeight * 0.84],
    [candlestickRadius * 1.2, candlestickHeight * 0.93],
    [candlestickRadius * 0.7, candlestickHeight],
  ], 20).translate(0, top, 0)
}

/** A tapered wax candle with a drip ring at its base. */
export function candleGeometry() {
  const {candleHeight, candlestickHeight, top} = dineTable
  const radius = 0.017
  return lathe([
    [radius * 1.35, 0],
    [radius * 1.35, 0.008],
    [radius, 0.02],
    [radius * 0.9, candleHeight],
  ], 12).translate(0, top + candlestickHeight, 0)
}

/** A teardrop flame above a candle. */
export function flameGeometry() {
  const {candleHeight, candlestickHeight, flameHeight, top} = dineTable
  return lathe([0.15, 0.55, 1, 0.7, 0.3, 0.08].map((radius, i, steps) => [radius * 0.012, flameHeight * i / (steps.length - 1)] as const), 8).translate(0, top + candlestickHeight + candleHeight, 0)
}

/** The table’s shaders read position, not UVs, so every part is stripped to the same attributes before merging. */
function withoutUvs(geometry: BufferGeometry) {
  geometry.deleteAttribute('uv')
  return geometry
}
/** Closed slab with sharp arrises; the gilt fillet and the oiled finish carry the edge. */
function slab(length: number, width: number, thickness: number) {
  return withoutUvs(new BoxGeometry(width, thickness, length))
}
/** A closed apron frame of four boards, mitered by overlap at the corners, with a scalloped lower edge. */
function apron(outerX: number, innerX: number, outerZ: number, innerZ: number, topY: number, bottomY: number) {
  const positions: Array<number> = []
  const normals: Array<number> = []
  const wave = (at: number) => Math.max(0, Math.sin((at / (innerZ * 2) + 0.5) * Math.PI * 6)) * 0.06
  for (const side of [-1, 1] as const) {
    // The long boards stop at the end boards’ inner faces, so each corner edge belongs to exactly two faces.
    board(positions, normals, 'z', side * outerX, side * innerX, -innerZ, innerZ, topY, at => bottomY + wave(at), side, 48)
  }
  const endSpan = (innerX - (outerX - innerX)) * 2
  const endWave = (at: number) => Math.max(0, Math.sin((at / endSpan + 0.5) * Math.PI * 2)) * 0.045
  for (const end of [-1, 1] as const) {
    // Stop one board-thickness short of the long boards, whose inner faces close these ends.
    const reach = innerX - (outerX - innerX)
    board(positions, normals, 'x', end * outerZ, end * innerZ, -reach, reach, topY, at => bottomY + endWave(at), end, 12)
  }
  return soup(positions, normals)
}
/** One closed apron board. `along` is its length axis; its thickness runs along the other horizontal axis, from `inner` to `outer`. */
function board(positions: Array<number>, normals: Array<number>, along: 'x' | 'z', outer: number, inner: number, from: number, to: number, topY: number, bottom: (at: number) => number, facing: number, segments: number) {
  const place = (at: number, across: number, y: number) => (along === 'z' ? new Vector3(across, y, at) : new Vector3(at, y, across))
  const orient = (alongN: number, up: number, acrossN: number) => (along === 'z' ? new Vector3(acrossN, up, alongN) : new Vector3(alongN, up, acrossN)).normalize()
  const span = to - from
  const samples = Array.from({length: segments + 1}, (_, i) => {
    const at = from + span * i / segments
    return {
      at,
      low: i === 0 || i === segments ? bottom(from + span * (i === 0 ? 1 : segments - 1) / segments) : bottom(at),
    }
  })
  for (let i = 0; i < segments; i++) {
    const {at: a, low: lowA} = samples[i]
    const {at: b, low: lowB} = samples[i + 1]
    for (const [across, direction] of [[outer, facing], [inner, -facing]] as const) {
      quad(positions, normals, place(a, across, topY), place(b, across, topY), place(b, across, lowB), place(a, across, lowA), orient(0, 0, direction))
    }
    quad(positions, normals, place(a, inner, topY), place(b, inner, topY), place(b, outer, topY), place(a, outer, topY), orient(0, 1, 0))
    const tangent = new Vector2(b - a, lowB - lowA)
    tangent.normalize()
    quad(positions, normals, place(a, outer, lowA), place(a, inner, lowA), place(b, inner, lowB), place(b, outer, lowB), orient(tangent.y, -tangent.x, 0))
  }
  for (const [sample, direction] of [[samples[0], -1], [samples.at(-1)!, 1]] as const) {
    quad(positions, normals, place(sample.at, inner, topY), place(sample.at, inner, sample.low), place(sample.at, outer, sample.low), place(sample.at, outer, topY), orient(direction * Math.sign(to - from), 0, 0))
  }
}
/** Turned post from the foot up to the slab, closed at both ends. */
function post() {
  const {footHeight, postRadius, top, topThickness} = dineTable
  const height = top - topThickness - footHeight
  return lathe([
    [postRadius * 1.7, 0],
    [postRadius * 1.7, height * 0.04],
    [postRadius * 0.85, height * 0.08],
    [postRadius * 0.8, height * 0.7],
    [postRadius * 0.95, height * 0.86],
    [postRadius * 1.3, height * 0.94],
    [postRadius * 1.5, height],
  ], 20)
}
/** Turned stretcher spanning the trestles, closed at both ends. */
function stretcher() {
  const {stretcherRadius, trestleSpan, trestleThickness} = dineTable
  const half = trestleSpan / 2 + trestleThickness / 2
  const turned = lathe([
    [stretcherRadius * 1.35, -half],
    [stretcherRadius * 1.35, -half + 0.05],
    [stretcherRadius * 0.72, -half + 0.11],
    [stretcherRadius, -half + 0.2],
    [stretcherRadius, half - 0.2],
    [stretcherRadius * 0.72, half - 0.11],
    [stretcherRadius * 1.35, half - 0.05],
    [stretcherRadius * 1.35, half],
  ], 16)
  turned.rotateX(Math.PI / 2)
  return turned
}
/** A scroll curling outward, standing with its ring in the xy plane. */
function scroll() {
  const {footBar} = dineTable
  const tube = footBar / 2
  const ring = footBar * 0.85
  const turned = lathe(Array.from({length: 8}, (_, i) => {
    const angle = Math.PI * 2 * i / 8
    return [ring + Math.cos(angle) * tube, Math.sin(angle) * tube] as const
  }), 14)
  turned.rotateZ(Math.PI / 2)
  return turned
}
/** A lathe closed by its own end caps, so the poles are not welded into one vertex. */
function lathe(points: ReadonlyArray<readonly [number, number]>, segments: number) {
  const profile = points.map(([x, y]) => new Vector2(x, y))
  const body = withoutUvs(new LatheGeometry(profile, segments))
  const positions: Array<number> = []
  const normals: Array<number> = []
  for (const [end, up] of [[profile[0], -1], [profile.at(-1)!, 1]] as const) {
    for (let i = 0; i < segments; i++) {
      const a = Math.PI * 2 * i / segments
      const b = Math.PI * 2 * (i + 1) / segments
      const rim = [a, b].map(angle => new Vector3(Math.sin(angle) * end.x, end.y, Math.cos(angle) * end.x))
      const corners = up > 0 ? rim : rim.toReversed()
      for (const point of [new Vector3(0, end.y, 0), ...corners]) {
        positions.push(point.x, point.y, point.z)
        normals.push(0, up, 0)
      }
    }
  }
  return mergeParts([body, soup(positions, normals)])
}
function quad(positions: Array<number>, normals: Array<number>, a: Vector3, b: Vector3, c: Vector3, d: Vector3, normal: Vector3) {
  const face = b.clone().sub(a).cross(d.clone().sub(a))
  const corners = face.dot(normal) >= 0 ? [a, b, c, a, c, d] : [a, d, c, a, c, b]
  const unit = normal.clone().normalize()
  for (const point of corners) {
    positions.push(point.x, point.y, point.z)
    normals.push(unit.x, unit.y, unit.z)
  }
}
/** A closed box centered on the origin. */
function box(width: number, height: number, depth: number) {
  const [hx, hy, hz] = [width / 2, height / 2, depth / 2]
  const positions: Array<number> = []
  const normals: Array<number> = []
  const faces: Array<[Vector3, Vector3, Vector3, Vector3, Vector3]> = [
    [new Vector3(0, 1, 0), v(-hx, hy, -hz), v(hx, hy, -hz), v(hx, hy, hz), v(-hx, hy, hz)],
    [new Vector3(0, -1, 0), v(-hx, -hy, hz), v(hx, -hy, hz), v(hx, -hy, -hz), v(-hx, -hy, -hz)],
    [new Vector3(0, 0, 1), v(-hx, hy, hz), v(hx, hy, hz), v(hx, -hy, hz), v(-hx, -hy, hz)],
    [new Vector3(0, 0, -1), v(hx, hy, -hz), v(-hx, hy, -hz), v(-hx, -hy, -hz), v(hx, -hy, -hz)],
    [new Vector3(1, 0, 0), v(hx, hy, hz), v(hx, hy, -hz), v(hx, -hy, -hz), v(hx, -hy, hz)],
    [new Vector3(-1, 0, 0), v(-hx, hy, -hz), v(-hx, hy, hz), v(-hx, -hy, hz), v(-hx, -hy, -hz)],
  ]
  for (const [normal, a, b, c, d] of faces) {
    quad(positions, normals, a, b, c, d, normal)
  }
  return soup(positions, normals)
  function v(x: number, y: number, z: number) {
    return new Vector3(x, y, z)
  }
}
function soup(positions: Array<number>, normals: Array<number>) {
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * The feast table’s timber and steel, in the table’s own frame: the origin is the middle of the floor beneath it and the tabletop
 * runs along z.
 *
 * The slab is one closed box. The apron is a closed frame with a scalloped lower edge.
 * Each trestle is a steel foot with curled ends carrying two turned walnut posts, and two turned stretchers tie the trestles together.
 */
export default class DineTableGeometry {
  readonly steel: BufferGeometry
  readonly wood: BufferGeometry

  constructor() {
    const {apronDrop, apronInset, apronThickness, footBar, footHalfWidth, footHeight, length, postInset, top, topThickness, trestleOffset, width} = dineTable
    const wood: Array<BufferGeometry> = [slab(length, width, topThickness).translate(0, top - topThickness / 2, 0)]
    const steel: Array<BufferGeometry> = []
    const outerX = width / 2 - apronInset
    const innerX = outerX - apronThickness
    const outerZ = length / 2 - apronInset
    const innerZ = outerZ - apronThickness
    wood.push(apron(outerX, innerX, outerZ, innerZ, top - topThickness, top - topThickness - apronDrop))
    for (const end of [-1, 1] as const) {
      const z = end * trestleOffset
      for (const side of [-1, 1] as const) {
        const x = side * (footHalfWidth - postInset)
        wood.push(post().translate(x, footHeight, z))
        steel.push(box(footBar * 1.8, 0.012, footBar * 1.8).translate(x, footHeight + 0.006, z))
      }
      steel.push(box((footHalfWidth - postInset) * 2, footBar, footBar).translate(0, footHeight - footBar / 2, z))
      for (const side of [-1, 1] as const) {
        const x = side * footHalfWidth
        steel.push(box(footBar, footHeight, footBar * 1.7).translate(x, footHeight / 2, z))
        steel.push(scroll().translate(x + side * footBar * 0.85, footBar * 1.35, z))
      }
    }
    for (const x of dineTableStretchers) {
      wood.push(stretcher().translate(x, dineTable.stretcherY, 0))
    }
    this.wood = mergeParts(wood.map(withoutUvs))
    this.steel = mergeParts(steel.map(withoutUvs))
  }

  dispose() {
    this.wood.dispose()
    this.steel.dispose()
  }
}
