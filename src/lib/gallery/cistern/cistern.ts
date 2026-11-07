import type {Wall} from '../../placement/wallGeometry.ts'
import type {Vec3} from '../types.ts'

import {cannonLaunch, flight} from '../alchemy/alchemyMachine.ts'
import {wallFace} from '../architectureDimensions.ts'
import {climbCrossfall, climbCulvert, climbRun} from '../climb.ts'
import {orbRadius} from '../orbs/index.ts'
import {cisternGrille, cisternGrilleHole} from './grille.ts'

type Point = readonly [x: number, z: number]

const [grilleX, wallZ] = cisternGrille.center
/** the face of the cistern’s flat wall, where the channel begins behind the grille and leaves through the culvert */
const faceZ = cisternGrille.channelZ
/** the radius of the channel’s round bottom */
const bore = 0.21
/** how high the channel’s sides stand upright over the middle of its round bottom, low for the orbs drifting along it */
const sides = 0.05
/** the radius of the channel’s turn, from behind the grille on the vestibule’s axis round to the run’s axis, where the culvert lies */
const turnRadius = (grilleX - climbCulvert.x) / 2
/** the middle of its turn, on the face of the flat wall */
const turnCenter: Point = [grilleX - turnRadius, faceZ]
const loop = turnRadius * Math.PI
/** how far its lip stands out of the approach’s north wall */
const lip = 0.06
/** how long it runs straight south through the flat wall and the approach’s wall back to back with it, out over the approach’s floor */
const outletRun = wallFace * 2 + lip
const length = loop + outletRun
/** how high the floor stands by the channel at the grille: level with the grille’s sill */
const floorAtGrille = cisternGrille.sill
/** how far in front of the backstop the shot’s orb has its middle as it meets it, and how far the backstop stands from the face of the flat wall */
const backstopGap = 0.3
/** how deep the backstop is, along the channel, and how far it reaches to either side of the channel’s middle */
const backstopSize = [0.35, 0.55] as const
/** how much room the orb has under the backstop, drifting along the channel’s bottom */
const backstopClearance = 0.05
/** where the channel’s bottom lies at its start, low enough under the floor at the backstop for an orb to drift on under it */
const startBottom = floorAtGrille - orbRadius * 2 - backstopClearance - 0.03
/** where it lies at its lip, a few centimeters over the culvert’s sill */
const lipBottom = climbCulvert.bottom + 0.04
/** how steeply the channel falls, evenly all along */
const channelFall = (startBottom - lipBottom) / length
/** How high the channel’s bottom lies `along` meters along it in plan. */
const bottom = (along: number) => startBottom - channelFall * along
/** How high its sides stand `along` meters along it, where the floor beside them lies no higher. */
const rim = (along: number) => bottom(along) + bore + sides
/** Where the channel’s middle lies in plan `along` meters along it, and which way it runs there. */
function plan(along: number): {
  direction: Point
  point: Point
} {
  if (along <= loop) {
    const angle = along / turnRadius
    return {
      point: [turnCenter[0] + turnRadius * Math.cos(angle), turnCenter[1] - turnRadius * Math.sin(angle)],
      direction: [-Math.sin(angle), -Math.cos(angle)],
    }
  }
  return {
    point: [turnCenter[0] - turnRadius, faceZ + along - loop],
    direction: [0, 1],
  }
}

/**
 * The channel round the cistern’s floor: a groove of stone with a round bottom and low upright sides, sunk into the floor, from behind the grille in a semicircle counter-clockwise to the flat wall again and straight out through the culvert in the approach’s north wall, on the run’s axis, its lip over the approach’s floor.
 * It falls evenly all along, and its water runs along it and spills off its lip, onto the drain in front of the culvert. Whatever drops into it rolls out with the water, steeply enough that an orb set down in it never comes to rest.
 * All values are in meters, in the world’s frame.
 */
export const cisternChannel = {
  bore,
  sides,
  length,
  lip,
  turn: {
    center: turnCenter,
    radius: turnRadius,
    end: loop,
  },
  /** how far along it its middle crosses the center line of the flat wall, on its way out through the culvert */
  crossing: loop + wallFace,
  /** how steeply it falls, per meter along it */
  fall: channelFall,
  bottom,
  rim,
  /** Where its middle lies `along` meters along it in plan, as high as its sides would be if they rose to a full circle round its bottom, and which way it runs there, in 3D. */
  at(along: number) {
    const {direction: [dx, dz], point: [x, z]} = plan(along)
    const norm = Math.hypot(1, channelFall)
    return {
      point: [x, bottom(along) + bore, z] as Vec3,
      direction: [dx / norm, -channelFall / norm, dz / norm] as Vec3,
    }
  },
} as const

/** where the shot’s orb meets the backstop: its middle an orb’s radius in front of the backstop’s face, as Rapier steps it there */
const impact = (() => {
  const z = faceZ - backstopGap + orbRadius
  let previous = cannonLaunch.position
  for (const point of flight(cannonLaunch.position, cannonLaunch.velocity)) {
    if (point[2] <= z) {
      const share = (previous[2] - z) / (previous[2] - point[2])
      return previous.map((value, axis) => value + (point[axis] - value) * share) as Vec3
    }
    previous = point
  }
  throw new Error('An orb flies on forever.')
})()
/** the radius of the cistern’s round wall, along its center line: the approach’s west wall runs on north into it */
const radius = turnCenter[0] - (climbCulvert.x - climbRun.width / 2)
/** where the half dome springs from the round wall, and how high it rises from there to its crown, which leans on the flat wall */
const [spring, rise] = [2.8, 2.6]
/** how steeply the floor falls toward the channel from both sides, like the climb’s paving toward its middle */
const apronFall = climbCrossfall
/** how steeply the floor falls downstream beside the channel: from the grille’s sill down to the channel’s sides where it leaves through the culvert, steeper than the channel, so the floor never lies under its sides */
const apronSlope = (floorAtGrille - rim(loop)) / loop
/** How high the floor stands beside the channel’s sides, `along` meters down it. */
const apronEdge = (along: number) => floorAtGrille - apronSlope * Math.min(along, loop)
/** how far the floor reaches from the turn’s center to the channel’s sides, inside its turn and outside of it */
const [innerEdge, outerEdge] = [turnRadius - bore, turnRadius + bore]
/** how far along the channel the backstop stands, from its south face to its north face */
const backstopAlong = [backstopGap, backstopGap + backstopSize[0]] as const
/** flat, as high as the floor beside the channel at its north face, where the floor lies lowest under it: sunk into the floor a little everywhere else */
const backstopUnderside = apronEdge(backstopAlong[1])
if (rim(0) > apronEdge(0) || bottom(backstopAlong[0]) + orbRadius * 2 + backstopClearance > backstopUnderside + 1e-9 || impact[1] < backstopUnderside + 0.02) {
  throw new RangeError('The cistern’s channel needs to sink into its floor, and its backstop to stop the shot over the channel, which runs on under it.')
}

/**
 * The backstop over the channel right behind the grille: a block of stone lying across the channel on the floor, faced with an iron plate square to the cannon’s shot, which stops every orb dead, drops it into the channel and lets it drift on under it.
 * Its face’s middle and its size are in the world’s frame: its depth along the channel, its width across it, and its height over its underside.
 */
export const cisternBackstop = {
  /** the middle of its face, on the shot’s line, at the height of the orb’s middle as it meets it */
  face: [grilleX, impact[1], faceZ - backstopGap] as Vec3,
  /** where the shot’s orb has its middle as it meets it */
  impact,
  underside: backstopUnderside,
  size: [backstopSize[0], backstopSize[1] * 2, impact[1] + orbRadius + 0.1 - backstopUnderside] as const,
}

/**
 * The Bastion’s cistern behind the Forge’s vestibule, a half-round chamber of castle stone under a ribbed half dome, which the alchemy machine shoots orbs into through the grille in the vestibule’s north wall: its flat wall, which the vestibule’s round wall touches back to back, runs on behind the approach, and its round wall springs from the approach’s west wall.
 * The channel winds round its floor, which falls toward it from all sides, so whatever lands in the cistern rolls into the channel and drifts out through the culvert. Nobody walks in it: the grille’s cells are an orb’s size and the culvert lies low.
 * All values are in meters, in the world’s frame.
 */
export const cistern = {
  /** the middle of its flat wall, on its center line, which the round wall’s center line turns round */
  center: [turnCenter[0], wallZ] as Point,
  radius,
  spring,
  rise,
  crown: spring + rise,
  /** the floor’s fall toward the channel, across it */
  apronFall,
  /** the floor’s fall downstream beside the channel */
  apronSlope,
  innerEdge,
  outerEdge,
  apronEdge,
  /** how high its floor lies at its lowest, by the channel where it leaves, and at its highest, in the middle of the channel’s turn */
  floorRange: [apronEdge(loop), floorAtGrille + apronFall * innerEdge] as const,
}

/** how many ribs run up the half dome, evenly round it between its ends */
export const cisternDomeRibs = 7
/**
 * The lantern hanging from the half dome over the floor inside the channel’s turn, between two of the dome’s ribs, which lights the cistern and shines out through the grille into the vestibule: the middle of its body, and where its rod meets the dome, straight above it, with the dome’s face there, facing down.
 * In the world’s frame.
 */
export const cisternLantern = (() => {
  const azimuth = Math.PI * (3.5 / (cisternDomeRibs + 1))
  const out = 3
  const [x, z] = [cistern.center[0] + Math.cos(azimuth) * out, cistern.center[1] - Math.sin(azimuth) * out]
  const inside = radius - wallFace
  const height = Math.sqrt(1 - (out / inside) ** 2)
  const anchorY = spring + rise * height
  // the ellipsoid’s gradient there, out and up, turned to face down into the cistern
  const [outward, upward] = [out / inside ** 2, rise * height / rise ** 2]
  const norm = Math.hypot(outward, upward)
  const light: Vec3 = [x, anchorY - 1.1, z]
  return {
    light,
    anchor: [x, anchorY, z] as Vec3,
    normal: [-outward / norm * Math.cos(azimuth), -upward / norm, outward / norm * Math.sin(azimuth)] as Vec3,
    drop: 1.1,
  }
})()

/**
 * How high the cistern’s floor lies under the point in plan: falling toward the channel from its round wall and from the middle of the channel’s turn, which stands highest, and downstream along it.
 * Over the channel, as high as the floor beside it.
 */
export function cisternFloorHeight(x: number, z: number) {
  const {along, out} = polar(x, z)
  const edge = apronEdge(along)
  if (out <= innerEdge) {
    const middle = apronEdge(0)
    return middle + (edge - middle) * out / innerEdge + apronFall * (innerEdge - out)
  }
  return edge + apronFall * Math.max(0, out - outerEdge)
}

/** Whether the point in plan lies within the cistern, inside its walls’ center lines. */
export function insideCisternPlan(x: number, z: number) {
  return z <= wallZ && Math.hypot(x - cistern.center[0], z - cistern.center[1]) <= radius
}

/** The cistern’s floor under the point in plan, or undefined outside of it. */
export function cisternFloor(x: number, z: number) {
  return insideCisternPlan(x, z) ? cisternFloorHeight(x, z) : undefined
}

/** Whether the position lies in the cistern, from a meter under its floor up to its crown. */
export function insideCistern([x, y, z]: Vec3) {
  const floor = cisternFloor(x, z)
  return floor !== undefined && y >= floor - 1 && y <= cistern.crown
}

/** How far round the channel’s turn the point in plan lies, from its start, and how far from the turn’s center; on the flat wall’s side, the nearer of its ends. */
function polar(x: number, z: number) {
  const angle = Math.atan2(turnCenter[1] - z, x - turnCenter[0])
  return {
    along: Math.min(Math.max(angle < -Math.PI / 2 ? Math.PI : angle, 0), Math.PI) * turnRadius,
    out: Math.hypot(x - turnCenter[0], z - turnCenter[1]),
  }
}
/** how many boxes the cistern’s air is cut into, in strips from west to east */
const airStrips = 8
/** Boxes round the cistern’s air, strips from west to east, each from its lowest floor to its crown and from the flat wall’s center line to the round wall’s, where the strip reaches furthest north. */
export function cisternChunks() {
  const [x, z] = cistern.center
  return Array.from({length: airStrips}, (_, strip) => {
    const [west, east] = [strip, strip + 1].map(edge => x - radius + radius * 2 * edge / airStrips)
    const nearest = west < x && east > x ? 0 : Math.min(Math.abs(west - x), Math.abs(east - x))
    return {
      min: [west, cistern.floorRange[0], z - Math.sqrt(radius ** 2 - nearest ** 2)] as Vec3,
      max: [east, cistern.crown, z] as Vec3,
    }
  })
}

/** how often the baseboard’s contact with the floor is sampled along a wall, at most this far apart */
const contactStep = 0.25
/** Where the floor meets the wall along its face, in the wall’s own coordinates, for its baseboard to follow. */
function floorContact(wall: Omit<Wall, 'id'>, at: (u: number) => Point) {
  const steps = Math.ceil(wall.width / contactStep)
  return Array.from({length: steps + 1}, (_, step) => {
    const u = -wall.width / 2 + wall.width * step / steps
    return [u, cisternFloorHeight(...at(u)) - wall.center[1]] as const
  })
}
const flatWall: Omit<Wall, 'id'> = {
  room: 'bastion',
  center: [cistern.center[0], 0, wallZ],
  // Facing north, into the cistern
  rotation: Math.PI,
  width: radius * 2,
  height: cistern.crown,
  sticky: false,
  trimStyle: 'plain',
  cornice: false,
}
const roundWall: Omit<Wall, 'id'> = {
  room: 'bastion',
  center: [cistern.center[0], 0, wallZ - radius],
  // Facing south, toward the middle of the flat wall, which it turns round
  rotation: 0,
  width: Math.PI * radius,
  curveRadius: radius,
  height: spring,
  sticky: false,
  trimStyle: 'plain',
  cornice: false,
}
/**
 * The cistern’s walls: the flat one, with the grille onto the vestibule and the culvert onto the approach in it, and the round one under the half dome.
 * They stand on the cistern’s floor, and their baseboards follow it.
 */
export const cisternWalls: ReadonlyArray<Wall> = [
  {
    ...flatWall,
    id: 'bastion-cistern_flat',
    baseboardProfile: floorContact(flatWall, u => [cistern.center[0] - u, faceZ]),
    holes: [
      {
        ...cisternGrilleHole(flatWall, [0, 0, 0]),
        name: 'vestibule',
      },
      {
        name: 'approach',
        u: cistern.center[0] - climbCulvert.x,
        width: climbCulvert.width,
        bottom: climbCulvert.bottom,
        height: climbCulvert.height,
        profile: 'rectangle',
        casing: false,
      },
    ],
  },
  {
    ...roundWall,
    id: 'bastion-cistern_round',
    baseboardProfile: floorContact(roundWall, u => {
      const angle = u / radius
      const face = radius - wallFace
      return [cistern.center[0] + Math.sin(angle) * face, wallZ - Math.cos(angle) * face]
    }),
  },
]
