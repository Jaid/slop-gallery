import type {Wall} from '../placement/wallGeometry.ts'

import {wallFace, wallOpeningTrim} from './architectureDimensions.ts'
import salon, {salonCeiling} from './salon.ts'

/** a painted panel of a fresco wall, in the wall’s own coordinates: where it runs along the wall from its center, and whether a doorway stands in it, which leaves it without a frame */
export type FrescoPanel = {
  pierced: boolean
  u: readonly [number, number]
}
/** where the black bands of a fresco wall stand and the panels between them, in the wall’s own coordinates */
export type FrescoLayout = {
  /** the middles of the bands along the wall, from its center */
  bands: ReadonlyArray<number>
  panels: ReadonlyArray<FrescoPanel>
  /** along a ring, how far apart the same spot comes round again: its whole length, so what reaches past one of its ends goes on from the other */
  period?: number
}
/**
 * A round rooflight: a disc of clear cast glass open to the sky, held in a square grid of bars and framed by a deep ring of plaster hanging below the slab, like the eye of a Roman dome let into a flat ceiling.
 * All values are in meters, relative to its middle.
 */
export type Rooflight = {
  barDepth: number
  barWidth: number
  /** the gilt bead along the ring’s lower inner edge */
  bead: number
  /** how far the ring hangs below the ceiling */
  depth: number
  /** width of the plaster ring around the opening */
  frame: number
  /** the glass sits 1 cm below the slab, above the glazing bars */
  glassY: number
  /** glazing bars split the glass into square panes of this size, a whole number of them across the opening */
  pane: number
  /** radius of the glazed opening cut through the slab */
  radius: number
}

/**
 * The Cinnabar sits north of the Vesper, across the Lobby’s north extension from the Salon, whose floor plan it mirrors: its east wall backs onto the Lobby’s west extension, from the Lobby’s north wall to the Vesper’s north wall’s line.
 * The Fortress climbs from the Oculus’ west bridge and enters its round vestibule, north of the room, from the west.
 */
const cinnabar = {
  center: [-salon.center[0], salon.center[1]],
  size: salon.size,
} as const satisfies {
  center: readonly [number, number]
  size: readonly [number, number]
}
const northZ = cinnabar.center[1] - cinnabar.size[1] / 2

/** The round rooflight in the middle of the ceiling, relative to the room’s center. */
export const cinnabarRooflight = {
  radius: 2.5,
  frame: 0.55,
  depth: 0.34,
  pane: 1,
  barWidth: 0.05,
  barDepth: 0.07,
  glassY: salonCeiling.underside - 0.01,
  bead: 0.04,
} as const satisfies Rooflight

const vestibuleRadius = 3
/**
 * The vestibule north of the Cinnabar, still the Cinnabar’s: a round anteroom at its floor on its axis, whose wall touches the middle of its north wall back to back, where an arch opens through both into the room.
 * The Fortress’ approach arrives through a second arch, from the west. Its ceiling is as high as the room’s, pierced in the middle by a round rooflight of its own.
 */
export const cinnabarVestibule = {
  center: [cinnabar.center[0], northZ - vestibuleRadius],
  /** the radius of its wall’s center line */
  radius: vestibuleRadius,
  /** relative to the vestibule’s center: a smaller eye than the room’s, in panes half as large */
  rooflight: {
    radius: 1,
    frame: 0.4,
    depth: 0.26,
    pane: 0.5,
    barWidth: 0.04,
    barDepth: 0.06,
    glassY: salonCeiling.underside - 0.01,
    bead: 0.03,
  },
} as const satisfies {
  center: readonly [number, number]
  radius: number
  rooflight: Rooflight
}

/**
 * The painted scheme of the walls, after the red rooms of Pompeii: a black socle under a field of cinnabar red, which black bands divide into panels, each framed by a thin ochre line, and a black frieze closes under the cornice. Heights are measured from the floor, in meters.
 */
export const cinnabarFresco = {
  /** the socle, from the baseboard up; the ochre fillet along its top is this wide */
  socle: 1,
  fillet: 0.03,
  /** the black bands between the panels, each with an ochre stalk down its middle */
  band: 0.22,
  stalk: 0.012,
  /** the black frieze under the cornice, which starts 0.47 m below the 5.5 m wall top */
  frieze: [4.6, 4.9] as const,
  /** the bands beside a doorway keep this far from its casing */
  openingMargin: 0.12,
  /** panels are about this long; a free run of wall is split into as many equal panels as come closest to it, at least one */
  panelLength: 3.9,
  /** the ochre frame inside every panel: how far it keeps from the panel’s edges, from the socle and from the frieze, and how wide its line is */
  frameInset: 0.25,
  frameRise: 0.3,
  frameLine: 0.012,
} as const

/** The terrazzo floor: a light field within a dark border, which the brass inlays divide at the same distance from the walls as every stone floor’s. */
export const cinnabarTerrazzo = {
  /** how far from the walls’ center lines the border reaches in, on the inlays’ line */
  border: 1.25,
} as const

/** Whether the wall is a whole ring, whose ends meet each other rather than other walls. */
export function isRing(wall: Pick<Wall, 'curveRadius' | 'width'>) {
  return wall.curveRadius !== undefined && Math.abs(wall.width - Math.PI * 2 * Math.abs(wall.curveRadius)) < 1e-9
}

/**
 * Where the black bands stand along a wall and the panels between them, in the wall’s own coordinates, from its center: free runs between the corners and the doorways’ casings are split into panels of about {@link cinnabarFresco.panelLength}, and a band flanks every doorway, whose bay counts as a pierced panel.
 * A ring has no corners: the run past its last doorway goes on round through the seam where its ends meet, up to its first, and every position comes back into the wall’s length, see {@link FrescoLayout.period}.
 */
export function frescoLayout(wall: Pick<Wall, 'curveRadius' | 'holes' | 'width'>): FrescoLayout {
  const {band, openingMargin, panelLength} = cinnabarFresco
  const openings = (wall.holes ?? []).filter(hole => !hole.bottom).map(hole => [hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, hole.u + hole.width / 2 + wallOpeningTrim + openingMargin] as const).toSorted((a, b) => a[0] - b[0])
  const bands: Array<number> = []
  const panels: Array<FrescoPanel> = []
  const run = (from: number, to: number) => {
    const length = to - from
    if (length <= band) {
      return
    }
    const count = Math.max(1, Math.round(length / panelLength))
    const width = (length - band * (count - 1)) / count
    for (let index = 0; index < count; index++) {
      const start = from + index * (width + band)
      panels.push({
        u: [start, start + width],
        pierced: false,
      })
      if (index < count - 1) {
        bands.push(start + width + band / 2)
      }
    }
  }
  const bay = ([left, right]: readonly [number, number]) => {
    bands.push(left - band / 2, right + band / 2)
    panels.push({
      u: [left, right],
      pierced: true,
    })
  }
  if (!isRing(wall)) {
    const end = wall.width / 2 - wallFace
    let cursor = -end
    for (const opening of openings) {
      run(cursor, opening[0] - band)
      bay(opening)
      cursor = opening[1] + band
    }
    run(cursor, end)
    return {
      bands,
      panels,
    }
  }
  const period = wall.width
  if (openings.length === 0) {
    // A band stands across the seam, and the panels go round from it back to it.
    bands.push(-period / 2)
    run(-period / 2 + band / 2, period / 2 - band / 2)
  } else {
    const [first] = openings
    let cursor = first[1] + band
    for (const opening of openings.slice(1)) {
      run(cursor, opening[0] - band)
      bay(opening)
      cursor = opening[1] + band
    }
    run(cursor, first[0] - band + period)
    bay(first)
  }
  const wrap = (u: number) => u - period * Math.round(u / period)
  return {
    bands: bands.map(wrap),
    panels: panels.map(({u: [start, end], pierced}) => ({
      u: [wrap(start), wrap(start) + end - start],
      pierced,
    })),
    period,
  }
}

export default cinnabar
