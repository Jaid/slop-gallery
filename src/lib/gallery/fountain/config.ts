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

/** A ballistic stream in the fountain’s plane through its axis, as [distance from the axis, height] points. */
export type Arc = {
  /** time of flight in seconds; longer flights rise higher */
  duration: number
  /** where the stream leaves its nozzle */
  from: ProfilePoint
  /** where it meets the water below */
  to: ProfilePoint
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

/** launch velocity of an arc as [away from the axis, up] in m/s */
export function arcVelocity({from, to, duration}: Arc): ProfilePoint {
  return [(to[0] - from[0]) / duration, (to[1] - from[1] + gravity / 2 * duration ** 2) / duration]
}

export function arcPoint(arc: Arc, age: number): ProfilePoint {
  const [radial, vertical] = arcVelocity(arc)
  return [arc.from[0] + radial * age, arc.from[1] + vertical * age - gravity / 2 * age ** 2]
}

const lobes = 8
const spouts = 8
const pools = {
  basin: 0.5,
  tazza: 1.6,
  cup: 2.4,
} as const
const basin = {
  /** mean distance of the inner wall from the axis */
  radius: 1.62,
  /** how far the eight lobes of the plan swell beyond and recede behind the mean */
  lobe: 0.07,
  floor: 0.16,
  rimTop: 0.62,
  /** from the inner wall to the outer face of the coping’s roll */
  coping: 0.28,
  /** from the inner wall to the outer face of the foot molding */
  foot: 0.3,
} as const
const tazza = {
  /** outer edge of the lip */
  radius: 1.08,
  /** inner face of the lip at the water line */
  innerRadius: 1.01,
  lipTop: 1.62,
  gadroons: 24,
  /** the spouts are notches through the lip, a flat floor this far either side of their middle and a ramp of the same angle up to the lip */
  spoutHalfAngle: 5 * Math.PI / 180,
  spoutRamp: 2.5 * Math.PI / 180,
  /** the notch floor, just under the water line */
  spoutFloor: pools.tazza - 0.008,
} as const
const cup = {
  radius: 0.48,
  /** inner face of the lip at the water line */
  innerRadius: 0.45,
  lipTop: pools.cup - 0.004,
  gadroons: 16,
} as const

/** angle of the `index`-th arcing jet, on the axis of a lobe of the basin; angles turn from +x toward +z */
export function jetAngle(index: number) {
  return index * 2 * Math.PI / lobes
}
/** angle of the `index`-th spout in the tazza’s lip, halfway between two arcing jets */
export function spoutAngle(index: number) {
  return (index + 0.5) * 2 * Math.PI / spouts
}
/** distance of the basin’s inner wall from the axis at `angle` */
export function basinRadius(angle: number) {
  return basin.radius + basin.lobe * Math.cos(lobes * angle)
}
/** 1 across a spout’s floor, easing to 0 over its ramps and 0 elsewhere along the tazza’s lip */
export function spoutOpening(angle: number) {
  const sector = 2 * Math.PI / spouts
  const offset = Math.abs(((angle - sector / 2) % sector + sector * 1.5) % sector - sector / 2)
  const t = Math.min(1, Math.max(0, (tazza.spoutHalfAngle + tazza.spoutRamp - offset) / tazza.spoutRamp))
  return t * t * (3 - 2 * t)
}

/**
 * A lobed basin on a round step, holding an octagonal plinth, a gadrooned baluster, a broad tazza and a small cup.
 *
 * The cup brims over in a bell-shaped veil, the tazza pours through eight notched spouts in its lip as ribbons, eight laminar jets arc from
 * gilt nozzles on the basin’s coping toward the plinth between the ribbons, and a crown jet rises from a gilt finial in the cup.
 * Heights are in meters above the Lobby floor, distances from the fountain’s axis.
 */
const fountain = {
  /** in the middle of the Lobby, right under its middle chandelier */
  position: [0, 0, (lobby.northZ + lobby.southZ) / 2] as [number, number, number],
  lobes,
  spouts,
  pools,
  basin,
  tazza,
  cup,
  step: {
    radius: 2.15,
    height: 0.1,
  },
  /** the farthest the fountain reaches from its axis: its step */
  radius: 2.15,
  /** the nearest the basin’s inner wall comes to the axis, between two lobes */
  basinInnerRadius: basin.radius - basin.lobe,
  basinFloor: basin.floor,
  rimTop: basin.rimTop,
  poolY: pools.basin,
  /** the octagonal plinth under the baluster, its flat sides facing the arcing jets */
  plinth: {
    apothem: 0.4,
    top: 0.8,
  },
  veil: {
    radius: cup.radius,
    y: pools.cup,
    outward: 0.32,
    until: pools.tazza,
  } satisfies WaterSheet,
  /** ribbons leave the spouts at the lip’s outer edge and fall into the basin */
  ribbon: {
    radius: tazza.radius + 0.004,
    y: pools.tazza,
    outward: 0.48,
    until: pools.basin,
    /** width and depth of the water at the spout; the width contracts as the water speeds up */
    width: 0.16,
    depth: 0.008,
  },
  /** from the gilt nozzles on the coping to the water in front of the plinth */
  arc: {
    from: [basin.radius + basin.lobe + 0.105, basin.rimTop + 0.07],
    to: [0.74, pools.basin],
    duration: 0.62,
  } satisfies Arc,
  arcRadius: 0.013,
  /** a laminar jet that slows, swells and breaks into droplets near its apex */
  jet: {
    radius: 0.016,
    y: 2.58,
    /** launch speed in m/s; it rises about 1.3 m */
    speed: 5.1,
    /** fraction of the rise that is drawn as a solid column, droplets take over above it */
    solid: 0.84,
  },
  sprayCount: 1400,
  gravity,
}

export default fountain

/** the ribbons as they leave the spouts: their middle runs half their depth below the water line */
export const ribbonSheet: WaterSheet = {
  radius: fountain.ribbon.radius,
  y: fountain.ribbon.y - fountain.ribbon.depth / 2,
  outward: fountain.ribbon.outward,
  until: fountain.ribbon.until,
}
