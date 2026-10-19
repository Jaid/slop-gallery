import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import mainEntrance from './entrance.ts'

type Point = [number, number]
type Bevel = {
  size: number
  thickness: number
}
/** Maps a point of the door plane to its grain coordinates: meters along the fibers and meters across them. */
type GrainMapping = (x: number, y: number) => Point

/** Segments per half circle; ≤ 2 mm chord error on the 2 m architrave. */
const halfCircleSegments = 32
/** Front face of the wall plaster that the entrance is mounted on. */
const wallFront = 0.11
const leafBack = 0.115
const leafFront = leafBack + mainEntrance.depth
const stile = 0.18
const meetingStile = 0.16
const muntin = 0.12
/** Gap between the two leaves, hidden behind the astragal. */
const meetingGap = 0.006
/** Clearance between the leaves and the architrave soffit. */
const leafClearance = 0.005
const rails = {
  bottom: [0.02, 0.36],
  lock: [0.98, 1.22],
  frieze: [2.66, 2.86],
} satisfies Record<string, Point>
/** Fielded panels: a 5 cm chamfer rising 2.5 cm from the frame’s sticking to the flat field. */
const panelBevel = {
  size: 0.05,
  thickness: 0.025,
} satisfies Bevel
/** The panels’ lowest edge stays 1 cm in front of the wall’s baseboard cap (z 0.25), which runs on behind the door. */
const panelEdge = 0.26
const arc = (center: Point, radius: number, from: number, to: number, minimumSegments = 1) => {
  const segments = Math.max(minimumSegments, Math.ceil(Math.abs(to - from) / Math.PI * halfCircleSegments))
  return Array.from({length: segments + 1}, (_, index) => {
    const angle = from + (to - from) * index / segments
    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius] as Point
  })
}
const toShape = (points: Array<Point>) => {
  const shape = new Shape
  shape.moveTo(...points[0])
  for (const point of points.slice(1)) {
    shape.lineTo(...point)
  }
  shape.closePath()
  return shape
}
const rectangle = (left: number, bottom: number, right: number, top: number): Array<Point> => [[left, bottom], [right, bottom], [right, top], [left, top]]
const extrude = (points: Array<Point>, from: number, to: number, bevel?: Bevel) => {
  // Straight runs are explicit points, so curveSegments never adds vertices.
  const geometry = new ExtrudeGeometry(toShape(points), {
    depth: to - from - (bevel ? bevel.thickness * 2 : 0),
    bevelEnabled: Boolean(bevel),
    bevelSegments: 1,
    bevelSize: bevel?.size ?? 0,
    bevelThickness: bevel?.thickness ?? 0,
    curveSegments: 1,
  })
  return geometry.translate(0, 0, from + (bevel?.thickness ?? 0))
}
/** Bakes the grain direction into the `woodGrain` attribute (along, across, seed) read by WalnutMaterial. */
const withGrain = (geometry: BufferGeometry, mapping: GrainMapping, seed: number) => {
  const position = geometry.getAttribute('position')
  const grain = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index++) {
    const [along, across] = mapping(position.getX(index), position.getY(index))
    grain.set([along, across, seed], index * 3)
  }
  geometry.setAttribute('woodGrain', new Float32BufferAttribute(grain, 3))
  return geometry
}
const vertical: GrainMapping = (x, y) => [y, x]
const horizontal: GrainMapping = (x, y) => [x, y]
/** Offsets a convex polygon of either winding inward by `distance`. */
function insetPolygon(points: Array<Point>, distance: number) {
  const area = points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return sum + x * nextY - nextX * y
  }, 0)
  const orientation = Math.sign(area)
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    const next = points[(index + 1) % points.length]
    const edgeNormal = (from: Point, to: Point) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1])
      return [-(to[1] - from[1]) / length * orientation, (to[0] - from[0]) / length * orientation] as Point
    }
    const a = edgeNormal(previous, point)
    const b = edgeNormal(point, next)
    const bisector: Point = [a[0] + b[0], a[1] + b[1]]
    const scale = distance / (1 + a[0] * b[0] + a[1] * b[1])
    return [point[0] + bisector[0] * scale, point[1] + bisector[1] * scale] as Point
  })
}

/**
 * A paired, arched walnut door in a limestone architrave.
 *
 * Each leaf is real joinery: stiles, rails and a curved head rail framing four fielded panels and an arched tympanum panel, every piece with its own grain direction. The leaves hang on concealed pivots, meet behind an astragal and open with bronze pull bars.
 */
export default class EntranceGeometry {
  readonly frame: BufferGeometry
  readonly leaves: BufferGeometry
  readonly metal: BufferGeometry

  constructor() {
    const {width, spring} = mainEntrance
    const radius = width / 2
    const soffit = radius + 0.025
    const leafRadius = soffit - leafClearance
    const headRadius = leafRadius - stile
    const archCenter: Point = [0, spring]
    const archHeight = (x: number, r: number) => spring + Math.sqrt(Math.max(0, r ** 2 - x ** 2))
    const leaves: Array<BufferGeometry> = []
    const frame: Array<BufferGeometry> = []
    const metal: Array<BufferGeometry> = []
    let seed = 0
    const wood = (points: Array<Point>, mapping: GrainMapping, from = leafBack, to = leafFront, bevel?: Bevel) => {
      leaves.push(withGrain(extrude(points, from, to, bevel), mapping, seed++ * 0.618034 % 1))
    }
    for (const side of [-1, 1]) {
      const mirror = (points: Array<Point>) => points.map(([x, y]) => [side * x, y] as Point)
      const inner = meetingGap / 2
      const panelLeft = inner + meetingStile
      const panelRight = leafRadius - stile
      const muntinLeft = (panelLeft + panelRight - muntin) / 2
      const muntinRight = muntinLeft + muntin
      const sideOf = (mapping: GrainMapping): GrainMapping => (x, y) => mapping(side * x, y)
      // Meeting stile, rising into the crown of the arch.
      const crownAngle = Math.acos(panelLeft / leafRadius)
      wood(mirror([[inner, rails.bottom[0]], [panelLeft, rails.bottom[0]], ...arc(archCenter, leafRadius, crownAngle, Math.acos(inner / leafRadius))]), sideOf(vertical))
      wood(mirror(rectangle(panelRight, rails.bottom[0], leafRadius, spring)), sideOf(vertical))
      // The head rail is bent along the arch, so its fibers follow the curve.
      const headAngle = Math.acos(panelLeft / headRadius)
      wood(mirror([...arc(archCenter, leafRadius, 0, crownAngle), ...arc(archCenter, headRadius, headAngle, 0)]), sideOf((x, y) => [Math.atan2(y - spring, x) * leafRadius, Math.hypot(x, y - spring)]))
      for (const [bottom, top] of Object.values(rails)) {
        wood(mirror(rectangle(panelLeft, bottom, panelRight, top)), sideOf(horizontal))
      }
      const fields: Array<Array<Point>> = []
      for (const [bottom, top] of [[rails.bottom[1], rails.lock[0]], [rails.lock[1], rails.frieze[0]]]) {
        wood(mirror(rectangle(muntinLeft, bottom, muntinRight, top)), sideOf(vertical))
        fields.push(rectangle(panelLeft, bottom, muntinLeft, top), rectangle(muntinRight, bottom, panelRight, top))
      }
      // Arched tympanum panel below the head rail.
      fields.push([[panelLeft, rails.frieze[1]], [panelRight, rails.frieze[1]], ...arc(archCenter, headRadius, 0, headAngle)])
      for (const field of fields) {
        // The bevel grows the field back out past the opening: its sides tuck 4 mm into the frame, leaving no slit to the wall behind.
        const inset = insetPolygon(field, panelBevel.size - 0.004)
        wood(mirror(inset), sideOf(vertical), leafBack, panelEdge + panelBevel.thickness, panelBevel)
      }
      // Long pull bar on standoffs, on the meeting stile at hand height.
      const pullX = side * (inner + meetingStile * 0.55)
      const pullY = (rails.lock[0] + rails.lock[1]) / 2 + 0.12
      const pullZ = leafFront + 0.07
      const backplate = new BoxGeometry(0.07, 0.96, 0.006)
      const bar = new CylinderGeometry(0.017, 0.017, 0.84, 8)
      metal.push(backplate.translate(pullX, pullY, leafFront + 0.003), bar.translate(pullX, pullY, pullZ))
      for (const dy of [-0.34, 0.34]) {
        const standoff = new CylinderGeometry(0.011, 0.013, pullZ - leafFront, 6, 1, true)
        metal.push(standoff.rotateX(Math.PI / 2).translate(pullX, pullY + dy, (pullZ + leafFront) / 2))
      }
      // Plinth and impost blocks sit on the architrave instead of overlapping the leaves.
      const plinthBlock = new BoxGeometry(0.33, 0.3, 0.48)
      const impostBlock = new BoxGeometry(0.36, 0.2, 0.42)
      frame.push(plinthBlock.translate(side * (soffit + 0.165), 0.15, 0.24), impostBlock.translate(side * (soffit + 0.18), spring, 0.21))
    }
    // The astragal covers the meeting gap from the bottom rail to the crown.
    wood(rectangle(-0.03, rails.bottom[0], 0.03, archHeight(0.03, leafRadius) - 0.02), vertical, leafFront - 0.008, leafFront + 0.018, {
      size: 0.006,
      thickness: 0.006,
    })
    const surround = (innerRadius: number, outerRadius: number, from: number, to: number) => extrude([
      [-outerRadius, 0],
      [-innerRadius, 0],
      ...arc(archCenter, innerRadius, Math.PI, 0),
      [innerRadius, 0],
      [outerRadius, 0],
      ...arc(archCenter, outerRadius, 0, Math.PI),
    ], from, to)
    frame.push(surround(soffit, radius + 0.25, wallFront, 0.36), surround(radius + 0.25, radius + 0.32, wallFront, 0.29))
    // Keystone at the crown: its underside follows the soffit 3 mm proud, and it rises to carry the wall’s cornice.
    const keystoneRadius = soffit - 0.003
    const keystoneAngle = Math.acos(0.13 / keystoneRadius)
    frame.push(extrude([...arc(archCenter, keystoneRadius, keystoneAngle, Math.PI - keystoneAngle, 4), [-0.19, mainEntrance.keystoneTop], [0.19, mainEntrance.keystoneTop]], wallFront, 0.39))
    metal.push(surround(radius + 0.03, radius + 0.055, 0.36, 0.38))
    this.leaves = mergeParts(leaves)
    this.frame = mergeParts(frame)
    this.metal = mergeParts(metal)
  }

  dispose() {
    this.leaves.dispose()
    this.frame.dispose()
    this.metal.dispose()
  }
}
