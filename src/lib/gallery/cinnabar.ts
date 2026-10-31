import type {Wall} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {wallFace, wallOpeningTrim} from './architectureDimensions.ts'
import salon, {salonCeiling} from './salon.ts'

/** a painted panel of a fresco wall, in the wall’s own coordinates: where it runs along the wall from its center, and whether a doorway stands in it, which leaves it without a frame */
export type FrescoPanel = {
  pierced: boolean
  u: readonly [number, number]
}

/**
 * The Cinnabar sits north of the Vesper, across the Lobby’s north extension from the Salon, whose floor plan it mirrors: its east wall backs onto the Lobby’s west extension, from the Lobby’s north wall to the Vesper’s north wall’s line.
 * The Bastion climbs from the Oculus’ west bridge and enters through the doorway in the middle of its north wall.
 */
const cinnabar = {
  center: [-salon.center[0], salon.center[1]],
  size: salon.size,
} as const satisfies {
  center: readonly [number, number]
  size: readonly [number, number]
}

/**
 * The round rooflight in the middle of the ceiling: a disc of clear cast glass open to the sky, held in a square grid of bars and framed by a deep ring of plaster hanging below the slab, like the eye of a Roman dome let into a flat ceiling.
 * All values are in meters, relative to the room’s center.
 */
export const cinnabarRooflight = {
  /** radius of the glazed opening cut through the slab */
  radius: 2.5,
  /** width of the plaster ring around the opening */
  frame: 0.55,
  /** how far the ring hangs below the ceiling */
  depth: 0.34,
  /** glazing bars split the glass into square panes of this size, a whole number of them across the opening */
  pane: 1,
  barWidth: 0.05,
  barDepth: 0.07,
  /** the glass sits 1 cm below the slab, above the glazing bars */
  glassY: salonCeiling.underside - 0.01,
  /** the gilt bead along the ring’s lower inner edge */
  bead: 0.04,
} as const

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

/** where a sculpture pedestal stands on the floor, in the middle of the room under the rooflight */
export const cinnabarPedestal: Vec3 = [cinnabar.center[0], 0, cinnabar.center[1]]

/**
 * Where the black bands stand along a wall and the panels between them, in the wall’s own coordinates, from its center: free runs between the corners and the doorways’ casings are split into panels of about {@link cinnabarFresco.panelLength}, and a band flanks every doorway, whose bay counts as a pierced panel.
 */
export function frescoLayout(wall: Pick<Wall, 'holes' | 'width'>) {
  const {band, openingMargin, panelLength} = cinnabarFresco
  const end = wall.width / 2 - wallFace
  const openings = (wall.holes ?? []).filter(hole => !hole.bottom).map(hole => [hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, hole.u + hole.width / 2 + wallOpeningTrim + openingMargin] as const).toSorted((a, b) => a[0] - b[0])
  const bands: Array<number> = []
  const panels: Array<FrescoPanel> = []
  let cursor = -end
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
  for (const [left, right] of openings) {
    run(cursor, left - band)
    bands.push(left - band / 2, right + band / 2)
    panels.push({
      u: [left, right],
      pierced: true,
    })
    cursor = right + band
  }
  run(cursor, end)
  return {
    bands,
    panels,
  }
}

export default cinnabar
