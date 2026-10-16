import type {LanternRoof} from '../materials/lights/LanternLight.ts'
import type {FloorRectangle} from './floors.ts'

import lobby from './lobby.ts'

/**
 * The Lobby’s coffered laylight ceiling, in meters relative to the room center.
 *
 * Plaster beams hang below the 18 cm ceiling slab on a 4 m grid. They split the ceiling into a central band as wide as the
 * glazed floor opening and two side bands of square coffers. Every coffer of the central band is a laylight: frosted panes
 * in thin bronze glazing bars, set back behind a stepped plaster frame. Above the floor opening the band’s cross beam is left
 * out, so one square laylight mirrors the glass floor beneath it.
 */
export const lobbyCeiling = {
  /** center of the ceiling slab every upper-floor room gets */
  slabY: 5.78,
  slabThickness: 0.18,
  underside: 5.78 - 0.18 / 2,
  /** beam pitch in both directions */
  bay: 4,
  beam: {
    width: 0.4,
    /** the beam’s body below the slab, above its soffit lip */
    depth: 0.22,
    /** a slightly wider lip finishes the soffit and catches a highlight along each edge */
    lipWidth: 0.47,
    lipDepth: 0.045,
  },
  /** the stepped frame between a beam and the coffer’s field */
  step: {
    width: 0.3,
    depth: 0.055,
  },
  /** square pane size of the laylight glass; every field is a whole number of panes */
  pane: 1,
  /** glazing bars run under the glass and frame its edges */
  bar: {
    width: 0.03,
    depth: 0.04,
    rim: 0.06,
  },
  /** the glass sits a hair under the slab, recessed behind the stepped frame */
  glassOffset: 0.006,
} as const

/** Lowest point of the beams; they have to stay above the cornice’s top at 5.395 m. */
export const lobbyBeamBottom = lobbyCeiling.underside - lobbyCeiling.beam.depth - lobbyCeiling.beam.lipDepth

export type CofferedBeam = {
  /** position across the beam: z for an x beam, x for a z beam */
  at: number
  axis: 'x' | 'z'
  /** start and end along the beam */
  from: number
  to: number
}
export type Coffer = FloorRectangle & {
  /** the clear field inside the stepped frame; for laylights, exactly the glazed area */
  field: FloorRectangle
  laylight: boolean
}

const halfWidth = lobby.width / 2
const halfDepth = (lobby.southZ - lobby.northZ) / 2
const roomCenterZ = (lobby.northZ + lobby.southZ) / 2
/** The glazed floor opening, relative to the room center. */
export const lobbyOpening: FloorRectangle = {
  center: [lobby.opening.center[0], lobby.opening.center[1] - roomCenterZ],
  size: lobby.opening.size,
}
const bandHalf = lobbyOpening.size[0] / 2
const openingNorth = lobbyOpening.center[1] - lobbyOpening.size[1] / 2
const openingSouth = lobbyOpening.center[1] + lobbyOpening.size[1] / 2
/** Beam lines across the room; the outermost ones sit on the end walls, so half of them disappears into the plaster. */
const crossLines = Array.from({length: Math.round(halfDepth * 2 / lobbyCeiling.bay) + 1}, (_, i) => -halfDepth + i * lobbyCeiling.bay)
/** Cross lines that stop at the central band, because they would cross the laylight over the floor opening. */
const insideOpening = (z: number) => z > openingNorth + 1e-6 && z < openingSouth - 1e-6
const longLines = [-halfWidth, -bandHalf, bandHalf, halfWidth]

/** Every beam of the ceiling, the wall-side ones included. Beams cross each other; they share one material, so the overlap never shows. */
export function lobbyBeams(): Array<CofferedBeam> {
  const beams: Array<CofferedBeam> = longLines.map(x => ({
    axis: 'z',
    at: x,
    from: -halfDepth,
    to: halfDepth,
  }))
  for (const z of crossLines) {
    if (insideOpening(z)) {
      beams.push({
        axis: 'x',
        at: z,
        from: -halfWidth,
        to: -bandHalf,
      }, {
        axis: 'x',
        at: z,
        from: bandHalf,
        to: halfWidth,
      })
    } else {
      beams.push({
        axis: 'x',
        at: z,
        from: -halfWidth,
        to: halfWidth,
      })
    }
  }
  return beams
}

const coffer = (x1: number, x2: number, z1: number, z2: number, laylight: boolean): Coffer => {
  const inset = lobbyCeiling.beam.width / 2 + lobbyCeiling.step.width
  const width = x2 - x1
  const depth = z2 - z1
  const center = [(x1 + x2) / 2, (z1 + z2) / 2] as const
  return {
    center,
    size: [width, depth],
    field: {
      center,
      size: [width - inset * 2, depth - inset * 2],
    },
    laylight,
  }
}

/** Every coffer between the beam lines, north to south and west to east. */
export function lobbyCoffers(): Array<Coffer> {
  const bandLines = crossLines.filter(z => !insideOpening(z))
  const coffers: Array<Coffer> = []
  for (const [lines, x1, x2, laylight] of [
    [crossLines, -halfWidth, -bandHalf, false],
    [bandLines, -bandHalf, bandHalf, true],
    [crossLines, bandHalf, halfWidth, false],
  ] as const) {
    for (let i = 0; i < lines.length - 1; i++) {
      coffers.push(coffer(x1, x2, lines[i], lines[i + 1], laylight))
    }
  }
  return coffers.toSorted((a, b) => a.center[1] - b.center[1] || a.center[0] - b.center[0])
}

/** Positions of the glazing bars inside one laylight field, along one axis, measured from the field’s center. */
export function glazingBarOffsets(length: number) {
  const panes = length / lobbyCeiling.pane
  if (Math.abs(panes - Math.round(panes)) > 1e-6) {
    throw new RangeError(`A laylight field of ${length} m does not hold a whole number of ${lobbyCeiling.pane} m panes.`)
  }
  return Array.from({length: Math.round(panes) - 1}, (_, i) => -length / 2 + (i + 1) * lobbyCeiling.pane)
}

/**
 * Lamps under the laylight band, as z offsets from the room center: one per bay, each centered between two cross beams. They
 * stand in for the daylight falling through the glass, so like it they shine down and out but barely up: a roof shades the
 * coffers above them, which would otherwise catch the full lamp half a meter away and burn out. The lamp over the floor
 * opening casts the room’s shadows.
 */
export const lobbyLamps = {
  y: 4.9,
  offsets: [-14, -8, -2, 6, 14],
  shadowCaster: -8,
  color: '#fff1d8',
  intensity: 32,
  distance: 14,
  shadowDistance: 22,
  roof: {
    // Seen from a lamp, the cornice and the tops of the walls stay below an elevation of 0.08, so they keep the full light. The
    // cross beams’ sides, 2 m away and up to 0.75 m higher, sit between 0.24 and 0.35, and the long beams around 0.12–0.18.
    start: 0.08,
    end: 0.3,
    leak: 0.12,
  },
} as const satisfies Record<string, unknown> & {roof: LanternRoof}

export default lobbyCeiling
