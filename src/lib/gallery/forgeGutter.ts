import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {wallCoordinates, wallOffset} from '../placement/wallGeometry.ts'
import {wallFace} from './architectureDimensions.ts'
import forge, {forgeVestibule} from './forge.ts'
import Gutter from './Gutter.ts'
import {orbRadius} from './orbs/index.ts'
import easedTurn, {turnReach} from './passages/easedTurn.ts'
import PassageRoute from './passages/PassageRoute.ts'
import {salonCeiling} from './salon.ts'

type Point = readonly [x: number, z: number]

/** how far the gutter’s middle runs in front of the center lines of the walls it follows: just clear of their cornices */
const offset = 0.6
/** its turn round the room’s north-west corner, easing in and out, see {@link easedTurn}, and how far from the corner where the straight lines it joins meet it starts and ends */
const corner = (() => {
  const turn = easedTurn(1.2, Math.PI / 2, 1.5)
  return {
    steps: turn.steps,
    reach: turnReach(turn),
  }
})()
/** the radius of its turn off the north wall onto the line through both walls */
const bendRadius = 1
/** the radius of the hook the vestibule’s gutter swings round onto the vestibule’s axis */
const hookRadius = 1
/** how far east of the vestibule’s middle the vestibule’s gutter ends on its axis, heading west at the arch onto the Bastion */
const spoutReach = 1
/** how wide the opening through both walls is across, round the orbs rolling through it, and how high its jambs stand over its sill */
const bore = {
  width: 0.42,
  jambs: 0.3,
} as const
const westX = forge.center[0] - forge.size[0] / 2
const northZ = forge.center[1] - forge.size[1] / 2
const {center: [vestibuleX, vestibuleZ]} = forgeVestibule
/** where the hole in the ceiling lies that orbs drop through into the gutter: over the west wall’s run, a meter north of the room’s middle */
const dropZ = forge.center[1] - 1
/** how far behind where orbs drop in the gutter’s closed head lies */
const headReach = 0.25
/** how high over the floor the sill of the opening through both walls lies, which orbs roll across: over the casing round the arch into the vestibule under it */
const sill = 3.45
/** how steeply both gutters fall */
const grade = 0.05
/** Where orbs drop into the room’s gutter from the ceiling and roll into the vestibule’s off the ledge, each opens into a wider mouth, its rims leaning in past upright, which takes in an orb coming in off its middle and keeps it from bouncing out. */
const catchment = {
  length: 0.5,
  lip: Math.PI * 100 / 180,
  radius: 0.3,
} as const
/**
 * Where the Forge’s north wall and the vestibule’s round wall touch, their center lines meeting over the middle of the arch through both: the one place they stand as one, without a gap behind either.
 * Orbs roll through both walls there, along the line from it that touches the circle the hook in the vestibule swings round.
 */
const through: Point = [vestibuleX, northZ]
/** the middle of the hook’s circle, a hook’s radius south of where the vestibule’s gutter ends */
const hookCenter: Point = [vestibuleX + spoutReach, vestibuleZ + hookRadius]
/** the direction of the line through both walls: off the line from where they touch to the hook’s middle, by as much as it takes to touch the hook’s circle on its left */
const lineHeading = (() => {
  const toHook = Math.atan2(hookCenter[1] - through[1], hookCenter[0] - through[0])
  return toHook + Math.asin(hookRadius / Math.hypot(hookCenter[0] - through[0], hookCenter[1] - through[1]))
})()
const [dx, dz] = [Math.cos(lineHeading), Math.sin(lineHeading)]
/** The point on the line through both walls `along` meters from where they touch, toward the vestibule. */
const onLine = (along: number): Point => [through[0] + dx * along, through[1] + dz * along]
/** how far the turn off the north wall turns, from heading east onto the line */
const bendSweep = lineHeading
/** how far along the line, from where the walls touch, the room’s gutter ends: where its turn off the north wall brings it onto the line */
const roomEnd = (northZ + offset - bendRadius * (1 - Math.cos(bendSweep)) - through[1]) / dz
/** where the room’s gutter turns off the north wall, along the line of its run east */
const bendStartX = onLine(roomEnd)[0] + bendRadius * Math.sin(bendSweep)
/** how far along the line the vestibule’s gutter starts, as far beyond where the walls touch as the room’s ends short of it */
const vestibuleStart = -roomEnd
/** how far along the line the vestibule’s gutter runs before its hook, where the line touches the hook’s circle */
const hookStart = Math.sqrt(Math.hypot(hookCenter[0] - through[0], hookCenter[1] - through[1]) ** 2 - hookRadius ** 2)
/** the planes the gutters’ ends meet the ledges along, parallel to the walls there, which both run east and west where they touch */
const roomCut = {
  point: onLine(roomEnd),
  normal: [0, 1],
} as const
const vestibuleCut = {
  point: onLine(vestibuleStart),
  normal: [0, -1],
} as const
/** The room’s gutter’s middle in plan: from its closed head over the west wall north under the hole in the ceiling, round the room’s north-west corner, east along the north wall and off it in a short turn onto the line through both walls. */
const roomRoute = new PassageRoute([westX + offset, dropZ + headReach], -Math.PI / 2, 0, 1, [
  {length: dropZ + headReach - (northZ + offset) - corner.reach},
  ...corner.steps,
  {length: bendStartX - (westX + offset) - corner.reach},
  {
    radius: bendRadius,
    angle: bendSweep,
  },
])
const [westRun, northRun] = roomRoute.pieces.filter(piece => piece.kind === 'line')
/**
 * The gutter round the room, ending over the ledge before the opening through both walls, its end’s bottom just over the sill and its brass resting on the ledge.
 * Its brackets stand in the west and north walls along its runs beside them, which have the walls on their left.
 */
const room = new Gutter(roomRoute, {
  catch: catchment,
  closed: true,
  head: sill + 0.015 + grade * roomRoute.length,
  grade,
  cuts: {end: roomCut},
  offset,
  spans: [westRun, northRun].map(({from, length}) => ({
    from,
    to: from + length,
    side: -1 as const,
  })),
})
/**
 * The gutter in the vestibule: from the ledge on the vestibule’s side of the opening on along the line through both walls, then round a hook onto the vestibule’s axis, ending in the air heading west at the arch onto the Bastion’s approach, where orbs fly off into the vestibule.
 * Its start lies a little lower than the sill, so an orb rolling off the ledge drops into it.
 */
const vestibule = new Gutter(new PassageRoute(onLine(vestibuleStart), lineHeading, 0, 1, [
  {length: hookStart - vestibuleStart},
  {
    radius: hookRadius,
    angle: -(Math.PI + lineHeading),
  },
]), {
  catch: catchment,
  closed: false,
  head: sill - 0.02,
  grade,
  cuts: {start: vestibuleCut},
  ceiling: salonCeiling.underside,
  hung: [[0, hookStart - vestibuleStart + hookRadius * (Math.PI + lineHeading)]],
})

/** Both gutters orbs roll down: round the room to the opening through its north wall and the vestibule’s, and on from there round the vestibule. */
export const forgeGutters = {
  room,
  vestibule,
} as const

/** The hole in the ceiling orbs drop through into the room’s gutter. */
export const forgeDrop = {
  /** where in plan, right over the room’s gutter, `headReach` meters down it */
  point: [westX + offset, dropZ] as Point,
  /** the radius of the hole through the ceiling */
  radius: 0.2,
  /** where an orb drops in from: a few centimeters over the ceiling slab, right over the hole */
  spawn: [westX + offset, salonCeiling.y + salonCeiling.thickness / 2 + orbRadius + 0.05, dropZ] as Vec3,
}

/**
 * The bare opening orbs roll through from the room’s gutter into the vestibule’s, through the Forge’s north wall and the vestibule’s round wall where both touch, over the arch through both: along its level sill, which plaster ledges under the gutters’ ends carry on out from both walls’ faces, so an orb rolls on the masonry from one gutter to the other.
 * All values are in meters, in the world’s frame.
 */
export const forgeBore = {
  sill,
  /** where it starts, on the room’s side, and ends, on the vestibule’s: at the gutters’ ends, along the line through both walls */
  from: onLine(roomEnd),
  to: onLine(vestibuleStart),
  /** how wide it is across */
  width: bore.width,
  /**
   * The ledges under both ends, boxes in plan from one corner to the other, their tops level with the sill: out from the faces of both walls, which run east and west where they touch, as far as the gutters’ ends and as wide along the walls as both the gutters’ cut ends and the way orbs roll through.
   */
  ledges: [roomCut, vestibuleCut].map(({point: [x, z], normal: [, nz]}) => {
    // The line meets the plane of the gutter’s end at `x` and the wall’s face further back; the gutter’s brass reaches out sideways along the plane as far as it reaches round its middle, stretched by the slant.
    const brass = (room.radius + room.thickness) / Math.abs(dz)
    const face = x + (through[1] + nz * wallFace - z) * dx / dz
    // Its back buried in the walls, to their center lines
    return {
      min: [Math.min(x, face) - brass - 0.05, Math.min(z, through[1])] as Point,
      max: [Math.max(x, face) + brass + 0.05, Math.max(z, through[1])] as Point,
    }
  }),
  /** how thick the ledges are under their tops */
  ledgeThickness: 0.07,
}

/**
 * The opening through a wall, in the wall’s own coordinates relative to `origin`, the origin of the room the wall’s coordinates are given in: round-headed, round the bore where it lies within the wall, from its sill up.
 */
export function boreOpening(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const us: Array<number> = []
  const length = Math.hypot(forgeBore.to[0] - forgeBore.from[0], forgeBore.to[1] - forgeBore.from[1])
  for (let along = 0; along <= length; along += 0.005) {
    for (const across of [-1, 0, 1]) {
      const [x, z] = onLine(roomEnd + along)
      const local: Vec3 = [x - dz * across * bore.width / 2 - origin[0], sill - origin[1], z + dx * across * bore.width / 2 - origin[2]]
      if (Math.abs(wallOffset(wall, local)) <= wallFace) {
        us.push(wallCoordinates(wall, local))
      }
    }
  }
  if (!us.length) {
    throw new RangeError('The bore doesn’t pass through the wall.')
  }
  const left = Math.min(...us)
  const right = Math.max(...us)
  const width = right - left
  const rise = Math.min(width / 2, 0.2)
  return {
    u: (left + right) / 2,
    width,
    bottom: sill - origin[1] - wall.center[1],
    height: sill - origin[1] - wall.center[1] + bore.jambs + rise,
    rise,
    profile: 'arch',
    casing: false,
  }
}
