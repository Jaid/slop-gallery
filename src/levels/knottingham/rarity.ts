import type {KnotEntry} from 'knot-materials'

import {knots} from 'knot-materials'
import {knotRarityMode} from 'knot-materials/exhibition.ts'
import KnotRarityEditor from 'knot-materials/KnotRarityEditor.ts'

import {narrate, notify} from '#src/lib/gallery/actions.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

import recordRarityChange from './recordRarityChange.ts'

export const knotRarityEditor = new KnotRarityEditor(knots, change => {
  if (!telemetry) {
    throw new Error('Rarity editing needs telemetry. Enable telemetry and configure its relay before editing.')
  }
  recordRarityChange(telemetry, change)
})

export function activateKnotSign(entry: KnotEntry) {
  if (knotRarityMode !== 'edit') {
    narrate(`prop-knot-${entry.id}`)
    return
  }
  try {
    const change = knotRarityEditor.cycle(entry.id)
    notify(`${entry.title}: ${change.value}/4 stars · telemetry queued`)
  } catch (error) {
    notify(Error.isError(error) ? error.message : 'The rarity edit could not be recorded.')
  }
}
