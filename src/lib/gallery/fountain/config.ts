import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'

import lobby from '../lobby.ts'

const gravity = 9.81

/** Water leaving the stone as a free sheet, sampled at equal flight times so that its UV v is the age of the water in seconds. */
export type WaterSheet = {
  /** horizontal speed away from the axis in m/s */
  outward: number
  /** distance from the axis where the water leaves the stone */
  radius: number
  /** number of separate spill channels around the lip */
  streams: number
  /** height of the receiving pool */
  until: number
  /** width of each channel at its lip, in meters */
  width: number
  /** height where the water leaves the stone, the brim of the overflowing pool */
  y: number
}

export function sheetFlightTime({y, until}: WaterSheet) {
  return Math.sqrt(2 * (y - until) / gravity)
}

export function sheetPoint(sheet: WaterSheet, age: number): ProfilePoint {
  return [sheet.radius + sheet.outward * age, sheet.y - gravity / 2 * age ** 2]
}

/** where a sheet meets its pool, measured from the axis */
export function sheetLanding(sheet: WaterSheet) {
  return sheetPoint(sheet, sheetFlightTime(sheet))[0]
}

const pools = {
  basin: 0.5,
  tazza: 1.94,
  cup: 2.96,
} as const
const basinApothem = 1.95
/** A molded octagonal basin, two melon-fluted tazze and discrete spill channels, crowned by a low bubbling jet. */
const fountain = {
  /** in the middle of the Lobby, right under its middle chandelier */
  position: [0, 0, (lobby.northZ + lobby.southZ) / 2] as [number, number, number],
  /** apothem of the octagonal plinth, its flat sides face the benches */
  basinApothem,
  /** circumradius of the plinth, the farthest the fountain reaches from its axis */
  radius: basinApothem / Math.cos(Math.PI / 8),
  /** apothem of the basin’s inner wall */
  basinInnerApothem: 1.6,
  basinFloor: 0.2,
  rimTop: 0.66,
  poolY: pools.basin,
  pools,
  spills: {
    tazza: {
      radius: 1.108,
      streams: 12,
      width: 0.085,
      y: pools.tazza,
      outward: 0.38,
      until: pools.basin,
    },
    cup: {
      radius: 0.532,
      streams: 8,
      width: 0.055,
      y: pools.cup,
      outward: 0.28,
      until: pools.tazza,
    },
  } satisfies Record<string, WaterSheet>,
  /** a laminar jet that slows, swells and breaks into droplets near its apex */
  jet: {
    radius: 0.026,
    y: 3.045,
    /** launch speed in m/s */
    speed: 3.2,
    /** fraction of the rise that is drawn as a solid column, droplets take over above it */
    solid: 0.86,
    /** six small outward arcs around the central bubbler */
    fan: {
      count: 6,
      outward: 0.5,
      speed: 2.35,
    },
  },
  sprayCount: 144,
  gravity,
}

export default fountain
