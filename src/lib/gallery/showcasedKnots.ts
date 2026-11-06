import type {KnotDump} from '../webmcp/tools.ts'
import type {KnotEntry} from 'knot-materials'
import type {Vec3} from 'math'

/** A Knot floating above the support at `position` (in museum meters), scaled to `height` meters in its standing pose; `rotation` is its yaw from facing +z. */
export type ShowcasedKnot = {
  entry: KnotEntry
  height: number
  position: Vec3
  rotation?: number
}

/** clearance between the hovering Knot’s lowest displaced point and its support */
export const knotShowcaseHoverGap = 0.08

/** the Knots the gallery showcases by their prop ids while they are mounted, for the `dump_knots` WebMCP tool; the gallery itself never loads the Knots’ catalog for them */
const showcasedKnots = new Map<string, KnotDump>

export default showcasedKnots
