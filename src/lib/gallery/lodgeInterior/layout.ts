import type {Vec3} from '../types.ts'

import lodge, {lodgeBay} from '../lodge.ts'
import UpholsteredSeatGeometry from './UpholsteredSeatGeometry.ts'

/** A point of the world plan in the room’s frame. */
const toRoom = ([x, z]: readonly [number, number]) => [x - lodge.center[0], z - lodge.center[1]] as const
/** the middle of the octagon the bay is cut from, which all four of its corners lie equally far from */
const bayCenter = toRoom(lodgeBay.center)
/** the octagonal boss in the bay’s ceiling that the hips run out of and the chandelier hangs from */
const boss = {
  /** to its corners, wide enough that the hips only meet inside it */
  radius: 0.4,
  height: 0.44,
}

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
/**
 * Furnishings of the Lodge in the room’s frame: the origin is the middle of the floor and +z points toward the fireplace on the south wall.
 *
 * Seating gathers around the hearth and keeps clear of the walkway that links both doorways at z −2.6, under the chandelier in front of the north bay.
 */
const lodgeInterior = {
  /** north edge of the furniture; the walkway between the doorways stays free north of it */
  walkwayEdge: -1.45,
  /** a timber settle under the west window, doubling as the step up into the window recess */
  windowSeat: {
    position: [-3.7, 0, 1.5] as Vec3,
    length: 2.8,
    depth: 0.85,
    /** width of the timber ends, which stand proud of the cushion */
    endWidth: 0.14,
    /**
     * The cushion runs between the ends and tucks 1 cm into each. It stays 1.5 cm behind their faces.
     *
     * Run over the full length, it poked out of the ends and shared their front and back faces, which flickered.
     */
    cushion: [2.8 - 0.28, 0.23, 0.85 - 0.03] as Vec3,
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
  /** the wagon wheel’s hub, hanging from the boss in the bay’s ceiling with its spokes looking along the boss’ faces */
  chandelier: {
    position: [bayCenter[0], 2.8, bayCenter[1]] as Vec3,
    /** from the hub up to the boss’ underside */
    drop: lodge.height - boss.height - 2.8,
    /** light height relative to the hub, a little below the wheel */
    lightY: -0.14,
    color: '#ffc68a',
    intensity: 20,
    /** far enough to reach into the bay’s corners */
    distance: 7,
    decay: 1.25,
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
  /** hewn beams across the room, resting on the east and west walls */
  beams: {
    z: [0, 3.5],
    /** width and height of each beam */
    size: [0.3, 0.34] as [number, number],
  },
  /**
   * The bay’s ceiling framing: hips run out of the boss into the bay’s four corners and two braces run back onto the first beam.
   *
   * All six sit square to faces of the boss, the hips to within 2°, so the boss and the wagon wheel below it look along the same eight directions.
   */
  bayFraming: {
    center: bayCenter,
    boss,
    /** width and height of the hips and braces, lighter than the beams */
    rafter: [0.24, 0.3] as [number, number],
    hips: lodgeBay.corners.map(toRoom),
    /** directions of the braces around y from +x toward +z, onto the faces of the boss that look south-east and south-west */
    braces: [Math.PI * 3 / 8, Math.PI * 5 / 8],
  },
} as const

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
  ]
}

export default lodgeInterior
