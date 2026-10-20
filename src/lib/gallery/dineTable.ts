import type {Vec3} from './types.ts'

import {rooms} from './walls.ts'

const dine = rooms.find(room => room.id === 'dine')!
/**
 * A long trestle feast table down the middle of Dine, under the room’s two rows of ceiling panes.
 *
 * The room is 12 × 24 m with 1 m checker tiles, so the tabletop covers a whole number of them and its centerline runs on a tile seam. Both ends stop short of the arches: the Lobby doorway is on the west wall at z = 3 and the Salon arch is centered in the north wall, which leaves the aisles and both thresholds open.
 */
const dineTable = {
  /** world position of the tabletop’s center, on the floor */
  position: [dine.center[0], 0, dine.center[1]] as Vec3,
  /** along the room, north–south */
  length: 9,
  width: 2,
  topThickness: 0.06,
  /** top of the tabletop, a dining height */
  top: 0.78,
  /** how far the slab’s corners are rounded */
  cornerRadius: 0.06,
  /** how far the underside of the slab is eased */
  edgeRadius: 0.012,
  /** the gilt fillet set into the slab’s edge */
  inlayWidth: 0.012,
  inlayInset: 0.004,
  /** walnut apron hanging under the slab */
  apronDrop: 0.14,
  apronThickness: 0.045,
  /** inset of the apron’s outer face from the slab’s edge */
  apronInset: 0.04,
  /** trestles, measured from the table’s center toward each end */
  trestleOffset: 3.2,
  /** clear span between the two trestles’ inner faces */
  get trestleSpan() {
    return this.trestleOffset * 2 - this.trestleThickness
  },
  trestleThickness: 0.07,
  /** feet reach this far out from the table’s centerline */
  footHalfWidth: 0.62,
  footHeight: 0.06,
  /** square section of the foot’s steel bar */
  footBar: 0.05,
  /** round posts between a foot and the apron */
  postRadius: 0.055,
  postInset: 0.09,
  /** turned walnut stretchers tying the trestles together, two of them */
  stretcherRadius: 0.06,
  stretcherY: 0.3,
  /** how far a stretcher’s center sits in from the foot’s end */
  stretcherInset: 0.16,
  /** candlesticks standing on the tabletop, measured from its center */
  candlestickOffsets: [-3.4, -1.7, 0, 1.7, 3.4],
  candlestickRadius: 0.055,
  /** height of a candlestick above the tabletop */
  candlestickHeight: 0.34,
  /** the candle and its flame, above the candlestick */
  candleHeight: 0.16,
  flameHeight: 0.07,
  /** damask runner down the middle of the top */
  runnerWidth: 0.42,
  runnerOverhang: 0.35,
  /** how far the runner drapes past the slab’s ends */
  runnerDrop: 0.28,
} as const

/** Where the apron’s inner and outer faces sit, as distances from the table’s center. */
export const dineTableApron = {
  x: [dineTable.width / 2 - dineTable.apronInset - dineTable.apronThickness, dineTable.width / 2 - dineTable.apronInset] as const,
  z: [dineTable.length / 2 - dineTable.apronInset - dineTable.apronThickness, dineTable.length / 2 - dineTable.apronInset] as const,
}

/** The four round posts of one trestle, as offsets from the trestle’s center. */
export function dineTablePosts(end: -1 | 1) {
  const z = end * dineTable.trestleOffset
  return [-1, 1].map(side => [side * (dineTable.footHalfWidth - dineTable.postInset), z] as const)
}

/** The two stretchers, as x offsets of their centers. */
export const dineTableStretchers = [-1, 1].map(side => side * (dineTable.footHalfWidth - dineTable.stretcherInset))

export default dineTable
