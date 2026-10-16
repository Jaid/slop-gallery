import type {Vec3} from '../types.ts'

import FirewoodStack from './FirewoodStack.ts'
import UpholsteredSeatGeometry from './UpholsteredSeatGeometry.ts'

export type Placement = {
  position: Vec3
  /** turn around y in radians */
  yaw: number
}
/** `position` is the point on the floor under the volume’s middle. */
export type FurnitureCollider = Placement & {
  name: string
  size: Vec3
}

const seatWidth = 0.68
const sofa = {
  position: [0, 0, -0.5] as Vec3,
  yaw: 0,
  seats: 3,
}
/** angled toward the fire, framing the hearth */
const armchairs: ReadonlyArray<Placement> = [
  {
    position: [2.2, 0, 1.6],
    yaw: -1.15,
  },
  {
    position: [-2.2, 0, 1.6],
    yaw: 1.15,
  },
]
const coffeeTable = {
  position: [0, 0, 1.1] as Vec3,
  size: [1.4, 0.46, 0.8] as Vec3,
}
/** a narrow sofa table behind the sofa, facing the walkway */
const consoleTable = {
  position: [0, 0, -1.22] as Vec3,
  size: [1.7, 0.74, 0.36] as Vec3,
}
const firewood = {
  position: [2.7, 0, 4.3] as Vec3,
  length: 0.52,
  radius: 0.075,
  rows: [5, 4, 3, 2],
}
/** on the hearth, beside the chimney breast */
const fireTools = {
  position: [-2, 0.2, 4.3] as Vec3,
}
/**
 * Furnishings of the Lodge in the room’s frame: the origin is the middle of the floor and +z points toward the fireplace on the south wall.
 *
 * Seating gathers around the hearth and keeps clear of the walkway that links both doorways along the north wall at z −2.6.
 */
const lodgeInterior = {
  /** north edge of the furniture; the walkway between the doorways stays free north of it */
  walkwayEdge: -1.45,
  /** a timber settle under the west window, doubling as the step up into the window recess */
  windowSeat: {
    position: [-3.7, 0, 1.5] as Vec3,
    length: 2.8,
  },
  /** a flat-woven kilim, centered in front of the fire */
  rug: {
    position: [0, 0, 0.75] as Vec3,
    size: [3.6, 2.6] as [number, number],
    thickness: 0.012,
  },
  sofa,
  seatWidth,
  armchairs,
  coffeeTable,
  consoleTable,
  /** three cloth-bound books, stacked a little askew on the table */
  books: [
    {
      size: [0.25, 0.045, 0.18] as Vec3,
      yaw: 0.12,
      color: '#2f4a3a',
    },
    {
      size: [0.23, 0.035, 0.16] as Vec3,
      yaw: -0.1,
      color: '#5c1d1b',
    },
    {
      size: [0.19, 0.03, 0.14] as Vec3,
      yaw: 0.34,
      color: '#b59d6c',
    },
  ],
  /** the wagon wheel’s hub, hanging above the coffee table */
  chandelier: {
    position: [0, 3.05, 1] as Vec3,
    /** light height above the hub, among the candle flames */
    lightY: 0.16,
    color: '#ffc68a',
    intensity: 38,
    distance: 14,
    /** eight flames on a 1.6 m wheel cast broad, soft shadows */
    shadowRadius: 8,
  },
  /**
   * The fieldstone chimney breast on the south wall. Lengths are along the room’s z; the fireplace group itself is turned by 180°, so its frame uses the negated values.
   *
   * The firebox keeps the dimensions the fire was built for: hearth top at 0.2 m, opening 2.3 m wide below a lintel at 1.9 m, back face 0.47 m behind the logs.
   */
  fireplace: {
    hearth: {
      size: [4.2, 0.2, 1.3] as Vec3,
      z: 4.35,
    },
    /** front face of the breast and its pillars */
    front: 3.9,
    /** depth of the breast from the wall */
    depth: 1.05,
    width: 3.6,
    openingHalfWidth: 1.15,
    /** underside of the stone lintel above the firebox */
    opening: 1.9,
    lintelHeight: 0.38,
    mantel: {
      size: [4, 0.2, 0.44] as Vec3,
      /** how far the mantel stands proud of the breast */
      overhang: 0.2,
    },
    /** the narrower chimney stack from the mantel up to the ceiling */
    chimney: {
      width: 3,
      depth: 0.77,
    },
    /** soot-black lining at the back of the firebox */
    back: 4.67,
  },
  /** split logs stacked beside the fireplace, ends toward the room */
  firewood,
  fireTools,
  /** iron candlesticks on the mantel, x in the fireplace’s mirrored frame */
  candlesticks: [-1.5, -1.25, 1.4],
  beams: {
    z: [-3.5, 0, 3.5],
    /** width and height of each beam */
    size: [0.3, 0.34] as [number, number],
  },
} as const

/** Height of every book’s center on the coffee table, stacked from the table top. */
export const bookCenters = lodgeInterior.books.map((book, index) => lodgeInterior.books.slice(0, index).reduce((top, below) => top + below.size[1], coffeeTable.size[1]) + book.size[1] / 2)

/** Solid volumes of the furniture for the physics world, in the room’s frame. */
export function lodgeFurnitureColliders(): Array<FurnitureCollider> {
  const {depth, backHeight, armWidth} = UpholsteredSeatGeometry
  const seat = (seats: number): Vec3 => [seats * seatWidth + armWidth * 2, backHeight, depth]
  return [
    {
      name: 'lodge-sofa',
      ...sofa,
      size: seat(sofa.seats),
    },
    ...armchairs.map((placement, index) => ({
      name: `lodge-armchair-${index}`,
      ...placement,
      size: seat(1),
    })),
    {
      name: 'lodge-coffee-table',
      position: coffeeTable.position,
      yaw: 0,
      size: coffeeTable.size,
    },
    {
      name: 'lodge-console-table',
      position: consoleTable.position,
      yaw: 0,
      size: consoleTable.size,
    },
    {
      name: 'lodge-firewood',
      position: firewood.position,
      yaw: 0,
      size: FirewoodStack.measure(firewood),
    },
    {
      name: 'lodge-fire-tools',
      position: fireTools.position,
      yaw: 0,
      size: [0.3, 0.86, 0.3],
    },
  ]
}

export default lodgeInterior
