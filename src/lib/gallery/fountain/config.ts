import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'

import lobby from '../lobby.ts'

const gravity = 9.81

/** Water leaving the stone as a free sheet, sampled at equal flight times so that its UV v is the age of the water in seconds. */
export type WaterSheet = {
  /** horizontal speed away from the axis in m/s */
  outward: number
  /** distance from the axis where the water leaves the stone */
  radius: number
  /** height of the receiving pool */
  until: number
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
  basin: 0.46,
  tazza: 1.37,
  cup: 1.985,
} as const
const basinApothem = 1.95
/** An octagonal basin holding a baluster tazza and a small cup, each overflowing as a continuous veil, crowned by a single jet. */
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
  rimTop: 0.58,
  poolY: pools.basin,
  pools,
  veils: {
    tazza: {
      radius: 0.99,
      y: pools.tazza,
      outward: 0.42,
      until: pools.basin,
    },
    cup: {
      radius: 0.38,
      y: pools.cup,
      outward: 0.3,
      until: pools.tazza,
    },
  } satisfies Record<string, WaterSheet>,
  /** a laminar jet that slows, swells and breaks into droplets near its apex */
  jet: {
    radius: 0.02,
    y: 2.03,
    /** launch speed in m/s */
    speed: 4.6,
    /** fraction of the rise that is drawn as a solid column, droplets take over above it */
    solid: 0.86,
  },
  sprayCount: 200,
  gravity,
}

export default fountain
