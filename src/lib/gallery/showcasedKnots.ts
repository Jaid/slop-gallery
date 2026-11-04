import type {KnotDump} from '../webmcp/tools.ts'
import type {KnotEntry} from 'knot-materials'
import type {Vec3} from 'math'

/** a Knot the gallery showcases, standing `height` meters tall with its foot at `position` in the museum’s meters, its face turned by `rotation` radians around the vertical from facing +z */
export type ShowcasedKnot = {
  entry: KnotEntry
  height: number
  position: Vec3
  rotation?: number
}

/** the Knots the gallery showcases by their prop ids while they are mounted, for the `dump_knots` WebMCP tool; the gallery itself never loads the Knots’ catalog for them */
const showcasedKnots = new Map<string, KnotDump>

export default showcasedKnots
