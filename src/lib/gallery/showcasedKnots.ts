import type {KnotDump} from '../webmcp/tools.ts'
import type {KnotEntry} from 'knot-materials'
import type {Vec3} from 'math'

/** a Knot the gallery showcases, floating at `position` in the museum’s meters and turned by `rotation` radians around the vertical */
export type ShowcasedKnot = {
  entry: KnotEntry
  position: Vec3
  rotation?: number
}

/** the Knots the gallery showcases by their prop ids while they are mounted, for the `dump_knots` WebMCP tool; the gallery itself never loads the Knots’ catalog for them */
const showcasedKnots = new Map<string, KnotDump>

export default showcasedKnots
