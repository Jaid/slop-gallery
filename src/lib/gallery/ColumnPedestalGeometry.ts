import type {ProfilePoint} from './RevolvedProfileGeometry.ts'

import {mergeParts} from '../geometry.ts'
import {colliderGeometry} from './architecture.ts'
import LobedProfileGeometry from './LobedProfileGeometry.ts'
import RevolvedProfileGeometry from './RevolvedProfileGeometry.ts'

/** how high the cap stands over the foot, as measured */
const height = 1.1
/** how high a column pedestal’s cap stands over its foot, which whatever it carries rests on */
export const columnPedestalHeight = 1.3
/** how much larger the column is built than its parts are measured below, so its cap stands {@link columnPedestalHeight} high */
const scale = columnPedestalHeight / height
/** the fluted shaft between the base and the capital, its ends hidden in both, as measured */
const shaft = {
  /** out to its fillets, the strips between the flutes */
  radius: 0.13,
  bottom: 0.23,
  top: 0.95,
  flutes: 20,
  /** how deep each flute cuts in under the fillets */
  fluteDepth: 0.011,
  /** how much of each flute’s period its fillet takes */
  fillet: 0.16,
}
/** how far the column reaches out from its axis, its plinth at the foot and its abacus at the cap, as measured */
const reach = {
  foot: 0.235,
  cap: 0.205,
}
/** the fluted shaft between the base and the capital, its ends hidden in both */
export const columnShaft = {
  ...shaft,
  radius: shaft.radius * scale,
  bottom: shaft.bottom * scale,
  top: shaft.top * scale,
  fluteDepth: shaft.fluteDepth * scale,
}
/** how far the column reaches out from its axis: its plinth at the foot and its abacus at the cap */
export const columnPedestalRadius = {
  foot: reach.foot * scale,
  cap: reach.cap * scale,
}
/** sides of the turned base and capital, enough to read round */
const sides = 72
/** points round a quarter or half circle round `[x, y]`, from angle `from` to `to`, ellipse radii `rx` and `ry` */
const arc = ([x, y]: ProfilePoint, [rx, ry]: ProfilePoint, from: number, to: number, steps = 8): Array<ProfilePoint> => Array.from({length: steps + 1}, (_, index) => {
  const angle = from + (to - from) * index / steps
  return [x + Math.cos(angle) * rx, y + Math.sin(angle) * ry] as const
})

/**
 * A flute’s cross-section through one period, for {@link LobedProfileGeometry}: a flat fillet round the crest, which takes `fillet` of the period, and a round channel between two fillets, down to −1 at its bottom.
 */
export function fluteLobe(fillet: number) {
  const half = fillet * Math.PI
  return (turn: number) => {
    const angle = Math.abs((turn % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI)
    if (angle <= half) {
      return 1
    }
    const across = (angle - half) / (Math.PI - half)
    return 1 - 2 * Math.sqrt(1 - (1 - across) ** 2)
  }
}

/**
 * A slender column of stone to carry small things like orbs: a round plinth under a large and a small torus, a fluted shaft and a capital of an astragal, an ovolo and a round abacus, its cap {@link columnPedestalHeight} over its foot.
 * Every part is measured smaller than it is, then built {@link scale} times larger.
 */
export default class ColumnPedestalGeometry {
  readonly stone = mergeParts([
    // The base, from inside the shaft out over its fillet and both tori and down the plinth, then in under it.
    new RevolvedProfileGeometry([
      [shaft.radius - 0.01, 0.24],
      [0.15, 0.24],
      ...arc([0.15, 0.195], [0.028, 0.03], Math.PI / 2, -Math.PI / 2, 12),
      ...arc([0.185, 0.115], [0.045, 0.05], Math.PI / 2, -Math.PI / 2, 16),
      [0.23, 0.065],
      [reach.foot, 0.06],
      [reach.foot, 0.005],
      [0.23, 0],
      [0, 0],
    ], {sides}),
    new LobedProfileGeometry([
      [shaft.radius - shaft.fluteDepth / 2, shaft.top, shaft.fluteDepth / 2, 0],
      [shaft.radius - shaft.fluteDepth / 2, shaft.bottom, shaft.fluteDepth / 2, 0],
    ], {
      lobe: fluteLobe(shaft.fillet),
      lobes: shaft.flutes,
      segmentsPerLobe: 24,
    }),
    // The capital, from the middle of its top out over the abacus, in under it round the ovolo, over the astragal and into the shaft.
    new RevolvedProfileGeometry([
      [0, height],
      [reach.cap - 0.005, height],
      [reach.cap, height - 0.005],
      [reach.cap, 1.06],
      [reach.cap - 0.005, 1.055],
      ...arc([0.15, 1.055], [0.035, 0.05], 0, -Math.PI / 2, 12),
      ...arc([0.15, 0.97], [0.016, 0.015], Math.PI / 2, -Math.PI / 2, 12),
      [0.14, 0.955],
      [0.14, 0.94],
      [shaft.radius - 0.01, 0.94],
    ], {sides}),
  ]).scale(scale, scale, scale)
  readonly collision = colliderGeometry(this.stone)

  dispose() {
    this.stone.dispose()
  }
}
