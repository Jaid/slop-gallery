import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {RouteLine, RouteStation} from './passages/PassageRoute.ts'
import type {Vec3} from './types.ts'

import {wallCoordinates, wallOffset} from '../placement/wallGeometry.ts'
import {wallFace} from './architectureDimensions.ts'
import forge, {forgeVestibule} from './forge.ts'
import {forgeWindow} from './lobbyWindows.ts'
import {orbRadius} from './orbs/index.ts'
import easedTurn, {turnReach} from './passages/easedTurn.ts'
import PassageRoute from './passages/PassageRoute.ts'
import {salonCeiling} from './salon.ts'

/** how far the gutter’s middle runs in front of the center lines of the walls it follows: just clear of their cornices, so an orb dropping through the ceiling into it misses them */
const offset = 0.6
/** A turn of the gutter round a corner, easing in and out, see {@link easedTurn}, and how far from the corner where the straight lines it joins meet it starts and ends. */
function cornerTurn(radius: number, angle: number, easing: number) {
  const turn = easedTurn(radius, angle, easing)
  return {
    steps: turn.steps,
    reach: turnReach(turn),
  }
}
/** its turns round the Forge’s corners */
const corner = cornerTurn(1.2, -Math.PI / 2, 1.5)
/** its turn off the north wall into the hole through it */
const wallBend = cornerTurn(1, Math.PI / 2, 0.8)
/** the radius of its last turn, off the vestibule’s wall toward the arch onto the Bastion */
const spoutTurn = 1
const [width, depth] = forge.size
const westX = forge.center[0] - width / 2
const eastX = forge.center[0] + width / 2
const northZ = forge.center[1] - depth / 2
const southZ = forge.center[1] + depth / 2
const {center: [vestibuleX, vestibuleZ], radius: vestibuleRadius} = forgeVestibule
/** round the vestibule, it keeps as far from its wall’s center line as along the Forge’s walls */
const ringRadius = vestibuleRadius - offset
/** where it runs north from the hole through the north wall into the vestibule: on the line touching its round run there, at its west, so it runs on into it without a bend */
const throughX = vestibuleX - ringRadius
/** where the hole in the ceiling lies that orbs drop through into it: over the west wall’s run, a meter north of the room’s middle */
const dropZ = forge.center[1] - 1
/** how far north of where orbs drop in the gutter’s closed head lies */
const headReach = 0.25
/** how far round the vestibule it runs from the west, by the north, before its last turn: so far that the last turn brings it round onto the vestibule’s axis, heading west toward the arch onto the Bastion */
const ringSweep = Math.PI - Math.asin(spoutTurn / (ringRadius - spoutTurn))
/** how far its last turn turns, from heading round the vestibule to heading west */
const spoutSweep = Math.PI * 3 / 2 - ringSweep
/**
 * The gutter’s middle in plan: from its closed head over the west wall south, round the Forge’s corners and along its south, east and north walls under their cornices, off the north wall west of the vestibule’s arch through both walls into the vestibule, round its wall from the west by the north toward the east, and in a last turn onto the vestibule’s axis, ending in the air heading west at the arch onto the Bastion’s approach.
 * Its floor height is its {@link ForgeGutter.bottom}, not the route’s.
 */
const route = new PassageRoute([westX + offset, dropZ - headReach], Math.PI / 2, 0, 1, [
  {length: southZ - offset - corner.reach - (dropZ - headReach)},
  ...corner.steps,
  {length: width - offset * 2 - corner.reach * 2},
  ...corner.steps,
  {length: depth - offset * 2 - corner.reach * 2},
  ...corner.steps,
  {length: eastX - offset - corner.reach - (throughX + wallBend.reach)},
  ...wallBend.steps,
  {length: northZ + offset - wallBend.reach - vestibuleZ},
  {
    radius: ringRadius,
    angle: ringSweep,
  },
  {
    radius: spoutTurn,
    angle: spoutSweep,
  },
])

/**
 * A brass gutter carried on iron brackets high round the Forge and its vestibule, which an orb dropping into it through a hole in the ceiling rolls down all the way: an open channel, round inside, falling at an even grade from its closed head to its open end, where the orb flies off into the vestibule.
 * All values are in meters, in the world’s frame.
 */
export type ForgeGutter = typeof forgeGutter

/** its straight runs along the Forge’s west, south, east and north walls, and its run north through both walls into the vestibule */
const [westRun, southRun, eastRun, northRun, through] = route.pieces.filter((piece): piece is RouteLine => piece.kind === 'line')
/** its run round the vestibule */
const ring = route.pieces.at(-2)!
/** how far past the window into the Lobby along the east wall its casing and a bracket’s reach keep the brackets off */
const windowMargin = 0.35
/** How far along the east wall’s run it passes the line straight across from the point in plan. */
const alongEastRun = (z: number) => eastRun.from + (eastRun.start[1] - z)
/** the stretch along the east wall’s run that passes the window into the Lobby, where hangers from the ceiling carry it instead of brackets in the wall */
const windowStretch = [alongEastRun(forgeWindow.z + forgeWindow.width / 2 + windowMargin), alongEastRun(forgeWindow.z - forgeWindow.width / 2 - windowMargin)] as const
if (!(windowStretch[0] > eastRun.from && windowStretch[1] < eastRun.from + eastRun.length)) {
  throw new Error('The gutter has to pass the Forge’s window along a straight run.')
}
/** how high over the floor the channel’s bottom lies at its head: its rims under the ceiling, beside the cornice */
const head = 5.15
/** how steeply it falls along its whole length */
const grade = 0.035
/** How high the channel’s bottom lies `along` meters down it. */
const bottom = (along: number) => head - grade * along

export const forgeGutter = {
  route,
  /** the radius of the channel’s round inside, in which an orb rolls with room to spare */
  radius: 0.2,
  /** how far up both sides from its bottom the channel reaches, in radians: a little past half round, its rims leaning in */
  lip: Math.PI * 100 / 180,
  /** how thick its brass is */
  thickness: 0.012,
  head,
  grade,
  bottom,
  /** where orbs drop into it, in plan, through the hole in the ceiling over it, `headReach` meters down it */
  drop: [westX + offset, dropZ] as const,
  /** the radius of the hole through the ceiling */
  dropRadius: 0.2,
  /** where an orb drops in from: a few centimeters over the ceiling slab, right over the hole through it */
  spawn: [westX + offset, salonCeiling.y + salonCeiling.thickness / 2 + orbRadius + 0.05, dropZ] as Vec3,
  /** how far apart its brackets stand along the walls, at most */
  bracketSpacing: 1.1,
  /** how far in front of the center lines of the walls it follows its middle runs */
  offset,
  /** the stretches along it beside walls, which its brackets hold it out from: its straight runs along the Forge’s walls on its right but where it passes the window, and its run round the vestibule on its left */
  spans: [
    ...[[westRun.from, westRun.from + westRun.length], [southRun.from, southRun.from + southRun.length], [eastRun.from, windowStretch[0]], [windowStretch[1], eastRun.from + eastRun.length], [northRun.from, northRun.from + northRun.length]].map(([from, to]) => ({
      from,
      to,
      side: 1 as const,
    })),
    {
      from: ring.from,
      to: ring.from + ring.length,
      side: -1 as const,
    },
  ],
  /** the stretches along it that hang from the ceiling instead: where it passes the window into the Lobby, which leaves no wall over it to hold brackets */
  hung: [windowStretch],
  /** the height of the ceiling’s underside, which its hangers hang from */
  ceiling: salonCeiling.underside,
  /** the stretch along it that crosses the gap between the north wall and the vestibule’s, from its turn off the north wall to where it meets the vestibule’s round run */
  gap: [northRun.from + northRun.length, through.from + through.length] as const,
  /** Whether the point lies in the gap behind the north wall and the vestibule’s, judged by their center lines. */
  inGap({x, z}: {
    x: number
    z: number
  }) {
    return z < northZ && Math.hypot(x - vestibuleX, z - vestibuleZ) > vestibuleRadius
  },
  /** Where the channel’s middle lies, `along` meters down it, with its heading and its bottom’s height. */
  at(along: number): RouteStation & {bottom: number} {
    return {
      ...route.at(along),
      bottom: bottom(along),
    }
  },
}

/** how far round the channel’s middle, out of the channel, whatever passes through a wall with it stays: its brass, and an orb riding up its side */
const clearance = forgeGutter.radius + forgeGutter.thickness + 0.06

/**
 * The hole the gutter passes through a wall by, in the wall’s own coordinates relative to `origin`, the origin of the room the wall’s coordinates are given in: round-headed, round everything within {@link clearance} of the channel’s middle where it lies within the wall.
 */
export function gutterOpening(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const points: Array<readonly [u: number, y: number]> = []
  for (let along = 0; along <= route.length; along += 0.01) {
    const {point: [x, z], heading, bottom: channelBottom} = forgeGutter.at(along)
    const middle = channelBottom + forgeGutter.radius
    // Only near the wall
    if (Math.abs(wallOffset(wall, [x - origin[0], middle - origin[1], z - origin[2]])) > clearance * 3) {
      continue
    }
    for (let step = 0; step < 32; step++) {
      const angle = step / 32 * Math.PI * 2
      const across = Math.sin(angle) * clearance
      const local: Vec3 = [x - Math.sin(heading) * across - origin[0], middle - Math.cos(angle) * clearance - origin[1], z + Math.cos(heading) * across - origin[2]]
      if (Math.abs(wallOffset(wall, local)) <= wallFace) {
        points.push([wallCoordinates(wall, local), local[1] - wall.center[1]])
      }
    }
  }
  if (!points.length) {
    throw new RangeError('The gutter doesn’t pass through the wall.')
  }
  const left = Math.min(...points.map(([u]) => u))
  const right = Math.max(...points.map(([u]) => u))
  const holeWidth = right - left
  // Its head springs over all of it.
  const rise = Math.min(holeWidth / 2, 0.25)
  return {
    u: (left + right) / 2,
    width: holeWidth,
    bottom: Math.min(...points.map(([, y]) => y)),
    height: Math.max(...points.map(([, y]) => y)) + rise,
    rise,
    profile: 'arch',
    casing: false,
  }
}
