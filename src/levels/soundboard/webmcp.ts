import type {WorldRoom} from '#src/lib/webmcp/analyzeWorld.ts'
import type {KnotDump} from '#src/lib/webmcp/tools.ts'

/** The level has no rooms; analyze_world reports everything as elsewhere. */
export const worldRooms: ReadonlyArray<WorldRoom> = []

export default function dumpKnots(): ReadonlyArray<KnotDump> {
  return []
}
