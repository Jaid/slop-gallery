import type {WallOpening} from '../placement/wallGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry} from 'three/webgpu'

import {insetPolygon, mergeParts} from '../geometry.ts'
import {openingArc} from '../placement/wallGeometry.ts'

type Point = readonly [x: number, y: number]

/** how far the leaves reach on into the jambs and the head round them, so no slit opens between them and the wall */
const tuck = 0.015
/** the leaves’ back and front faces, measured out of the wall’s center line: set back into the opening, behind the face of the wall round them */
const leafBack = 0
const leafFront = 0.05
/** between the leaves, hidden behind the astragal */
const meetingGap = 0.006
/** the lacquered borders the upholstery leaves free: along the jambs and round the head, and along the meeting edge */
const stile = 0.12
const meetingStile = 0.1
/** the lacquered rails across each leaf, from below to above, by their heights over the floor; the frieze rail’s are under the arch’s spring */
const rails = {
  bottom: [0, 0.32],
  lock: [0.98, 1.12],
} as const
const friezeBelowSpring = [0.22, 0.08] as const
/** how the velvet cushions swell out of the leaves, round their edges */
const cushion = {
  depth: 0.006,
  bevelSize: 0.022,
  bevelThickness: 0.018,
  /** their backs sink this far into the leaves, so no seam shows */
  sink: 0.004,
}
/** the brass nailheads round every cushion, on the lacquer just beside it */
const nailhead = {
  radius: 0.0075,
  spacing: 0.05,
  offset: 0.014,
}
/** the ring pull on each leaf, hanging from a boss on a rosette in the middle of the lock rail, near the meeting edge, over the low cushion */
const pull = {
  /** from the cushions’ inner edge */
  inset: 0.1,
  ringRadius: 0.07,
  tube: 0.008,
  rosetteRadius: 0.045,
  /** how far the ring hangs in front of the leaf, clear of the cushions’ crowns */
  standoff: 0.052,
}
/** Segments per half circle along the arch. */
const halfCircleSegments = 48
const arc = (center: Point, radius: number, from: number, to: number) => {
  const segments = Math.max(1, Math.ceil(Math.abs(to - from) / Math.PI * halfCircleSegments))
  return Array.from({length: segments + 1}, (_, index) => {
    const angle = from + (to - from) * index / segments
    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius] as const
  })
}
const rectangle = (left: number, bottom: number, right: number, top: number): Array<Point> => [[left, bottom], [right, bottom], [right, top], [left, top]]
const toShape = (points: ReadonlyArray<Point>) => {
  const shape = new Shape
  shape.moveTo(...points[0])
  for (const point of points.slice(1)) {
    shape.lineTo(...point)
  }
  shape.closePath()
  return shape
}
/** Points spaced evenly round the closed polygon, about `spacing` apart. */
const around = (points: ReadonlyArray<Point>, spacing: number) => {
  const edges = points.map((point, index) => {
    const next = points[(index + 1) % points.length]
    return {
      from: point,
      to: next,
      length: Math.hypot(next[0] - point[0], next[1] - point[1]),
    }
  })
  const perimeter = edges.reduce((sum, edge) => sum + edge.length, 0)
  const count = Math.max(1, Math.round(perimeter / spacing))
  const result: Array<Point> = []
  let edge = 0
  let start = 0
  for (let index = 0; index < count; index++) {
    const distance = perimeter * index / count
    while (start + edges[edge].length < distance) {
      start += edges[edge].length
      edge++
    }
    const {from, to, length} = edges[edge]
    const t = length ? (distance - start) / length : 0
    result.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t])
  }
  return result
}

/**
 * The Cell’s closed door, filling its arched opening in the wall’s own frame, centered on the opening: x along the wall, y up from the floor and z out of the wall’s center line into the room.
 *
 * Two leaves in black lacquer like the Cell’s trim, upholstered like a theater’s doors in the velvet of its walls: on each, a low cushion, a tall one and an arched one under the head, swelling out of the lacquer and edged with brass nailheads. A brass kick plate guards each leaf’s foot, a brass ring pull hangs from its lock rail and a lacquered astragal covers the meeting edge.
 * Set back into the opening, behind the wall’s face, the casing of the wall’s trim frames it as it frames the open arch.
 */
export default class CellDoorGeometry {
  readonly brass: BufferGeometry
  readonly lacquer: BufferGeometry
  readonly velvet: BufferGeometry

  constructor(opening: Omit<WallOpening, 'u'>) {
    const half = opening.width / 2
    const {radius, center: spring} = openingArc({
      ...opening,
      u: 0,
    })
    if (opening.profile !== 'arch' || Math.abs(radius - half) > 1e-9) {
      throw new RangeError('The Cell’s door fills a round-arched opening, its head a half circle.')
    }
    const archCenter: Point = [0, spring]
    const leafRadius = radius + tuck
    const headRadius = radius - stile
    const frieze = [spring - friezeBelowSpring[0], spring - friezeBelowSpring[1]] as const
    const lacquer: Array<BufferGeometry> = []
    const velvet: Array<BufferGeometry> = []
    const brass: Array<BufferGeometry> = []
    // A dome facing out of the leaves.
    const nail = new SphereGeometry(nailhead.radius, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2)
    nail.rotateX(Math.PI / 2)
    for (const side of [-1, 1]) {
      const mirror = (points: ReadonlyArray<Point>) => points.map(([x, y]) => [side * x, y] as const)
      const inner = meetingGap / 2
      const panelLeft = inner + meetingStile
      const panelRight = half - stile
      const crown = Math.acos(inner / leafRadius)
      const leaf = new ExtrudeGeometry(toShape(mirror([[inner, 0.004], [leafRadius, 0.004], ...arc(archCenter, leafRadius, 0, crown)])), {
        depth: leafFront - leafBack,
        bevelEnabled: false,
        curveSegments: 1,
      })
      lacquer.push(leaf.translate(0, 0, leafBack))
      const headAngle = Math.acos(panelLeft / headRadius)
      const panels: Array<ReadonlyArray<Point>> = [
        rectangle(panelLeft, rails.bottom[1], panelRight, rails.lock[0]),
        rectangle(panelLeft, rails.lock[1], panelRight, frieze[0]),
        [[panelLeft, frieze[1]], [panelRight, frieze[1]], ...arc(archCenter, headRadius, 0, headAngle)],
      ]
      for (const panel of panels) {
        // The bevel swells the cushion back out to the panel’s edge.
        const swelling = new ExtrudeGeometry(toShape(mirror(insetPolygon(panel, cushion.bevelSize))), {
          depth: cushion.depth,
          bevelEnabled: true,
          bevelSegments: 5,
          bevelSize: cushion.bevelSize,
          bevelThickness: cushion.bevelThickness,
          curveSegments: 1,
        })
        velvet.push(swelling.translate(0, 0, leafFront - cushion.sink + cushion.bevelThickness))
        for (const [x, y] of around(insetPolygon(panel, -nailhead.offset), nailhead.spacing)) {
          brass.push(nail.clone().translate(side * x, y, leafFront))
        }
      }
      // A kick plate across the bottom rail, from stile to stile.
      const kickPlate = new BoxGeometry(panelRight - panelLeft + stile * 0.6, rails.bottom[1] - 0.06, 0.003)
      brass.push(kickPlate.translate(side * (panelLeft + panelRight) / 2, rails.bottom[1] / 2, leafFront + 0.0015))
      // The ring pull: a rosette on the lock rail, a boss standing out of it and the ring hanging from the boss in front of the low cushion.
      const pullX = side * (panelLeft + pull.inset)
      const pullY = (rails.lock[0] + rails.lock[1]) / 2
      const rosette = new CylinderGeometry(pull.rosetteRadius, pull.rosetteRadius + 0.004, 0.008, 24)
      const boss = new CylinderGeometry(0.016, 0.02, pull.standoff, 16)
      const ring = new TorusGeometry(pull.ringRadius, pull.tube, 10, 40)
      brass.push(
        rosette.rotateX(Math.PI / 2).translate(pullX, pullY, leafFront + 0.004),
        boss.rotateX(Math.PI / 2).translate(pullX, pullY, leafFront + pull.standoff / 2),
        ring.translate(pullX, pullY - pull.ringRadius, leafFront + pull.standoff),
      )
    }
    nail.dispose()
    // The astragal covers the gap between the leaves from the floor up to just under the crown.
    const astragal = new BoxGeometry(0.05, spring + radius - 0.012, 0.016)
    lacquer.push(astragal.translate(0, (spring + radius - 0.012) / 2 + 0.004, leafFront + 0.008))
    this.lacquer = mergeParts(lacquer)
    this.velvet = mergeParts(velvet)
    this.brass = mergeParts(brass)
  }

  dispose() {
    this.lacquer.dispose()
    this.velvet.dispose()
    this.brass.dispose()
  }
}
