import type {WorldRoom} from '#src/lib/webmcp/analyzeWorld.ts'
import type {KnotDump} from '#src/lib/webmcp/tools.ts'

import {knotExhibition, knotFloatHeight} from 'knot-materials/exhibition.ts'

import {knotRarityEditor} from './rarity.ts'

/** The level has no rooms; analyze_world reports everything as elsewhere. */
export const worldRooms: ReadonlyArray<WorldRoom> = []

export default function dumpKnots(): ReadonlyArray<KnotDump> {
  const ratings = knotRarityEditor.getSnapshot()
  return knotExhibition.map(exhibit => ({
    id: exhibit.id,
    name: exhibit.title,
    position: [exhibit.position[0], knotFloatHeight, exhibit.position[2]],
    rarity: ratings.get(exhibit.id)!,
  }))
}
