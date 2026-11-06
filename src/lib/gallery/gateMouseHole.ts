import type {WallOpening} from '../placement/wallGeometry.ts'

/** The round-headed mouse hole at the foot of both barred gates, wide enough for an orb. */
export default function gateMouseHole({u, bottom = 0}: Pick<WallOpening, 'bottom' | 'u'>): WallOpening {
  return {
    u,
    bottom,
    width: 0.6,
    height: bottom + 0.5,
    profile: 'arch',
  }
}
