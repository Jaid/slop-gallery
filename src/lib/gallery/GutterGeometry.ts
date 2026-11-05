import type Gutter from './Gutter.ts'
import type {GutterCut, GutterSpan} from './Gutter.ts'
import type {RouteStation} from './passages/PassageRoute.ts'

import {BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {wallFace} from './architectureDimensions.ts'

/** the steps the channel’s turns are cut into, in radians */
const turnStep = 1 / 10
/** how many facets the channel’s round inside and outside each have */
const facets = 12
/** how many facets round each rim’s rolled edge */
const rimFacets = 3
/** the cross-section of a bracket’s flat iron: how wide and how thick */
const bracketIron = [0.03, 0.012] as const
/** the radius of a hanger’s rod */
const hangerRod = 0.008
/** how far below its arm a bracket’s brace meets the wall */
const braceDrop = 0.28

type Station = RouteStation & {bottom: number}

/**
 * A gutter’s parts, in world space: its brass `channel`, closed by a plate at its start or open there and open at its end, the round inside of it and of its plate as `collision`, and the iron `brackets` holding it out from the walls along its spans beside them and the hangers carrying it from the ceiling along its hung stretches.
 */
export default class GutterGeometry {
  readonly brackets: BufferGeometry
  readonly channel: BufferGeometry
  readonly collision: BufferGeometry

  constructor(gutter: Gutter) {
    const stations = gutter.route.stations(0, gutter.route.length, turnStep).map(station => ({
      ...station,
      bottom: gutter.bottom(station.along),
    }))
    this.channel = channelGeometry(gutter, stations)
    this.collision = insideGeometry(gutter, stations)
    const supports = [...bracketParts(gutter, gutter.spans), ...hangerParts(gutter)]
    this.brackets = supports.length ? mergeParts(supports) : new BufferGeometry
  }

  dispose() {
    for (const geometry of [this.brackets, this.channel, this.collision]) {
      geometry.dispose()
    }
  }
}

/** The point `out` meters from the channel’s middle at the station, `angle` radians round from straight down toward the right. */
const around = ({point: [x, z], heading, bottom}: Station, middle: number, out: number, angle: number) => {
  const across = Math.sin(angle) * out
  return new Vector3(x - Math.sin(heading) * across, bottom + middle - Math.cos(angle) * out, z + Math.cos(heading) * across)
}
/** the direction out of the channel’s middle at the station, `angle` radians round from straight down toward the right */
const outward = ({heading}: Station, angle: number) => new Vector3(-Math.sin(heading) * Math.sin(angle), -Math.cos(angle), Math.cos(heading) * Math.sin(angle))
/** The points pushed along the channel onto the plane its open end is cut along, if it is cut: each as far forward or back along the station’s heading as it takes to lie in it. */
const cut = (points: ReadonlyArray<readonly [Vector3, Vector3]>, {heading}: Station, plane?: GutterCut) => {
  if (!plane) {
    return points
  }
  const {normal: [nx, nz], point: [px, pz]} = plane
  const [dx, dz] = [Math.cos(heading), Math.sin(heading)]
  const facing = dx * nx + dz * nz
  if (Math.abs(facing) < 0.2) {
    throw new RangeError('A gutter’s end can’t be cut along a plane it runs almost alongside.')
  }
  return points.map(([point, normal]) => {
    const shift = ((px - point.x) * nx + (pz - point.z) * nz) / facing
    return [point.clone().add(new Vector3(dx * shift, 0, dz * shift)), normal] as const
  })
}
/** The rings of points lofted along the stations, the first and the last cut along the gutter’s planes. */
const rings = (gutter: Gutter, stations: ReadonlyArray<Station>, ring: (station: Station) => ReadonlyArray<readonly [Vector3, Vector3]>) => stations.map((station, index) => {
  const plane = index === 0 ? gutter.cuts.start : (index === stations.length - 1 ? gutter.cuts.end : undefined)
  return cut(ring(station), station, plane)
})
/** The channel’s cross-section at a station, as points with their normals: round its inside from rim to rim, over the rolled edge of that rim, back round its outside and over the other rim’s edge. */
function profile(gutter: Gutter, station: Station) {
  const {thickness} = gutter
  const lip = gutter.lipAt(station.along)
  const radius = gutter.radiusAt(station.along)
  const points: Array<readonly [Vector3, Vector3]> = []
  for (let i = 0; i <= facets; i++) {
    const angle = -lip + lip * 2 * i / facets
    points.push([around(station, radius, radius, angle), outward(station, angle).negate()])
  }
  // The rim rolls over from the inside to the outside round the middle of the brass.
  const rim = (angle: number, from: number) => {
    const middle = around(station, radius, radius + thickness / 2, angle)
    const tangent = outward(station, angle + Math.sign(angle) * Math.PI / 2)
    const normalOut = outward(station, angle)
    for (let i = 1; i < rimFacets; i++) {
      const turn = from + Math.PI * i / rimFacets
      const normal = normalOut.clone().multiplyScalar(-Math.cos(turn)).addScaledVector(tangent, Math.sin(turn))
      points.push([middle.clone().addScaledVector(normal, thickness / 2), normal])
    }
  }
  rim(lip, 0)
  for (let i = facets; i >= 0; i--) {
    const angle = -lip + lip * 2 * i / facets
    points.push([around(station, radius, radius + thickness, angle), outward(station, angle)])
  }
  rim(-lip, Math.PI)
  return points
}
function channelGeometry(gutter: Gutter, stations: ReadonlyArray<Station>) {
  const loft = new RingLoft
  for (const [index, ring] of rings(gutter, stations, station => profile(gutter, station)).entries()) {
    loft.add(ring, true, index > 0)
  }
  // A closed start’s end plate, across the inside and the brass round it: round the outside and over both rims.
  if (gutter.closed) {
    const [first] = stations
    const back = new Vector3(-Math.cos(first.heading), 0, -Math.sin(first.heading))
    loft.fan(around(first, gutter.radiusAt(0), 0, 0), profile(gutter, first).slice(facets + 1).map(([point]) => point), back)
  }
  return loft.geometry()
}
function insideGeometry(gutter: Gutter, stations: ReadonlyArray<Station>) {
  const loft = new RingLoft
  const inside = (station: Station) => Array.from({length: facets + 1}, (_, i) => {
    const lip = gutter.lipAt(station.along)
    const radius = gutter.radiusAt(station.along)
    const angle = -lip + lip * 2 * i / facets
    return [around(station, radius, radius, angle), outward(station, angle).negate()] as const
  })
  for (const [index, ring] of rings(gutter, stations, inside).entries()) {
    loft.add(ring, false, index > 0)
  }
  if (gutter.closed) {
    const [first] = stations
    loft.fan(around(first, gutter.radiusAt(0), 0, 0), inside(first).map(([point]) => point), new Vector3(Math.cos(first.heading), 0, Math.sin(first.heading)))
  }
  return loft.geometry()
}
/** Iron brackets every so often along the spans beside walls: an arm from the wall under the channel and a brace from lower down the wall out to it. */
function bracketParts(gutter: Gutter, spans: ReadonlyArray<GutterSpan>) {
  const {offset, thickness} = gutter
  const [ironWidth, ironThickness] = bracketIron
  const parts: Array<BufferGeometry> = []
  /** from the wall’s face, a little into it */
  const armStart = offset - wallFace + 0.02
  for (const {from, to, side} of spans) {
    const count = Math.max(1, Math.round((to - from) / gutter.bracketSpacing))
    for (let i = 0; i < count; i++) {
      const station = {
        ...gutter.route.at(from + (to - from) * (i + 0.5) / count),
        bottom: 0,
      }
      station.bottom = gutter.bottom(station.along)
      const {heading, point: [x, z], bottom} = station
      // Across the channel, toward the wall
      const [ax, az] = [-Math.sin(heading) * side, Math.cos(heading) * side]
      const armY = bottom - thickness - ironThickness / 2
      // out under the channel’s far edge
      const armEnd = -(gutter.radiusAt(station.along) + thickness)
      const length = armStart - armEnd
      const arm = new BoxGeometry(ironWidth, ironThickness, length)
      const middle = (armStart + armEnd) / 2
      arm.rotateY(Math.atan2(ax, az))
      parts.push(arm.translate(x + ax * middle, armY, z + az * middle))
      // The brace, from lower down the wall to two thirds out along the arm
      const foot = new Vector3(x + ax * armStart, armY - braceDrop, z + az * armStart)
      const reach = armStart - length * 2 / 3
      const top = new Vector3(x + ax * reach, armY, z + az * reach)
      const span = top.clone().sub(foot)
      const brace = new BoxGeometry(ironWidth, ironThickness, span.length())
      brace.lookAt(span)
      const center = foot.add(top).multiplyScalar(0.5)
      parts.push(brace.translate(center.x, center.y, center.z))
    }
  }
  return parts
}
/** Iron hangers every so often along the stretches hung from the ceiling: a rod down from the ceiling on either side of the channel and a strap under it between their feet, clear of the orbs rolling along it. */
function hangerParts(gutter: Gutter) {
  const {ceiling, thickness} = gutter
  const [ironWidth, ironThickness] = bracketIron
  const parts: Array<BufferGeometry> = []
  for (const [from, to] of gutter.hung) {
    const count = Math.max(1, Math.round((to - from) / gutter.bracketSpacing))
    for (let i = 0; i < count; i++) {
      const {along, heading, point: [x, z], bottom} = gutter.at(from + (to - from) * (i + 0.5) / count)
      /** how far to either side of the channel’s middle the rods hang, just outside its brass */
      const reach = gutter.radiusAt(along) + thickness + hangerRod
      const [ax, az] = [-Math.sin(heading), Math.cos(heading)]
      const strapY = bottom - thickness - ironThickness / 2
      const strap = new BoxGeometry(ironWidth, ironThickness, reach * 2 + hangerRod * 2)
      strap.rotateY(Math.atan2(ax, az))
      parts.push(strap.translate(x, strapY, z))
      for (const side of [-1, 1]) {
        const rod = new CylinderGeometry(hangerRod, hangerRod, ceiling - strapY, 6)
        parts.push(rod.translate(x + ax * side * reach, (ceiling + strapY) / 2, z + az * side * reach))
      }
    }
  }
  return parts
}
/** a strip of quads between rings of points with their normals, as an indexed geometry */
class RingLoft {
  readonly indices: Array<number> = []
  readonly normals: Array<number> = []
  readonly positions: Array<number> = []
  private count = 0

  /** Adds a ring after the one before it, joined to it by quads between its points in turn, the last one to the first one if `closed`. */
  add(points: ReadonlyArray<readonly [Vector3, Vector3]>, closed: boolean, joined: boolean) {
    const start = this.count
    for (const [point, normal] of points) {
      this.positions.push(point.x, point.y, point.z)
      this.normals.push(normal.x, normal.y, normal.z)
    }
    this.count += points.length
    if (!joined) {
      return
    }
    const previous = start - points.length
    const edges = closed ? points.length : points.length - 1
    for (let i = 0; i < edges; i++) {
      const next = (i + 1) % points.length
      this.triangle(previous + i, start + i, start + next)
      this.triangle(previous + i, start + next, previous + next)
    }
  }

  /** Adds a closed fan round `center` through the points in turn, facing along `normal`. */
  fan(center: Vector3, points: ReadonlyArray<Vector3>, normal: Vector3) {
    const start = this.count
    for (const point of [center, ...points]) {
      this.positions.push(point.x, point.y, point.z)
      this.normals.push(normal.x, normal.y, normal.z)
    }
    this.count += points.length + 1
    for (let i = 0; i < points.length; i++) {
      const [a, b] = [start + 1 + i, start + 1 + (i + 1) % points.length]
      // Wound to face along the normal
      const ab = (new Vector3).subVectors(points[(i + 1) % points.length], center)
      const facing = (new Vector3).subVectors(points[i], center).cross(ab).dot(normal) > 0
      this.indices.push(start, ...facing ? [a, b] : [b, a])
    }
  }

  geometry() {
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3))
    geometry.setIndex(this.indices)
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  }

  /** Adds the triangle between three of its points, wound to face the way their normals point. */
  private triangle(a: number, b: number, c: number) {
    const corner = (index: number) => new Vector3(this.positions[index * 3], this.positions[index * 3 + 1], this.positions[index * 3 + 2])
    const normal = (index: number) => new Vector3(this.normals[index * 3], this.normals[index * 3 + 1], this.normals[index * 3 + 2])
    const [pa, pb, pc] = [a, b, c].map(corner)
    const facing = pb.sub(pa).cross(pc.sub(pa)).dot(normal(a).add(normal(b)).add(normal(c)))
    this.indices.push(...facing >= 0 ? [a, b, c] : [a, c, b])
  }
}
