import type {KnotDump} from '../webmcp/tools.ts'

/** the Knots the gallery showcases by their prop ids while they are mounted, for the `dump_knots` WebMCP tool; the gallery itself never loads the Knots’ catalog for them */
const showcasedKnots = new Map<string, KnotDump>

export default showcasedKnots
