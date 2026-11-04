import type {Wall} from '../placement/wallGeometry.ts'

import {wallFace, wallOpeningTrim} from './architectureDimensions.ts'

/** a painted panel of a fresco wall, in the wall’s own coordinates: where it runs along the wall from its center, and whether an opening stands in it, which leaves it without a frame */
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
 * The painted scheme of a frescoed room’s walls, after the red rooms of Pompeii: a black socle under a field of cinnabar red, which black bands divide into panels, each framed by a thin ochre line, and a black frieze closes under the cornice. Heights are measured from the floor, in meters.
 */
export const pompeianFresco = {
  /** the socle, from the baseboard up; the ochre fillet along its top is this wide */
  socle: 1,
  fillet: 0.03,
  /** the black bands between the panels, each with an ochre stalk down its middle */
  band: 0.22,
  stalk: 0.012,
  /** the black frieze under the cornice, which starts 0.47 m below the 5.5 m wall top */
  frieze: [4.6, 4.9] as const,
  /** the bands beside a doorway or a window keep this far from its casing */
  openingMargin: 0.12,
  /** panels are about this long; a free run of wall is split into as many equal panels as come closest to it, at least one */
  panelLength: 3.9,
  /** the ochre frame inside every panel: how far it keeps from the panel’s edges, from the socle and from the frieze, and how wide its line is */
  frameInset: 0.25,
  frameRise: 0.3,
  frameLine: 0.012,
} as const

/** Whether the wall is a whole ring, whose ends meet each other rather than other walls. */
export function isRing(wall: Pick<Wall, 'curveRadius' | 'width'>) {
  return wall.curveRadius !== undefined && Math.abs(wall.width - Math.PI * 2 * Math.abs(wall.curveRadius)) < 1e-9
}

/**
 * Where the black bands stand along a wall and the panels between them, in the wall’s own coordinates, from its center: free runs between the corners and the openings’ casings are split into panels of about {@link pompeianFresco.panelLength}, and a band flanks every doorway and window, whose bay counts as a pierced panel.
 * A ring has no corners: the run past its last doorway goes on round through the seam where its ends meet, up to its first, and every position comes back into the wall’s length, see {@link FrescoLayout.period}.
 */
export function frescoLayout(wall: Pick<Wall, 'curveRadius' | 'holes' | 'width'>): FrescoLayout {
  const {band, openingMargin, panelLength} = pompeianFresco
  const openings = (wall.holes ?? []).map(hole => [hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, hole.u + hole.width / 2 + wallOpeningTrim + openingMargin] as const).toSorted((a, b) => a[0] - b[0])
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
