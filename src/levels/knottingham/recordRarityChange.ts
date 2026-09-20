import type {RarityChange} from 'knot-materials/KnotRarityEditor.ts'
import type VictoriaClient from 'victoria-browser-client'

/** Explicit curation records, not inferred preferences; no high-cardinality metric labels. */
export default function recordRarityChange(telemetry: Pick<VictoriaClient, 'log' | 'startSpan'>, change: RarityChange) {
  const attributes = {
    'event.name': 'knot.rarity.changed',
    'knot.id': change.id,
    'knot.candidate.id': change.candidateId,
    'knot.title': change.title,
    'rarity.baseline': change.baseline,
    'rarity.previous': change.previous,
    'rarity.value': change.value,
    'edit.sequence': change.sequence,
    'edit.source': 'sign',
  }
  const span = telemetry.startSpan('knot.rarity.changed', {attributes})
  telemetry.log(JSON.stringify(attributes), {
    level: 'info',
    attributes,
    context: span,
  })
  span.end()
}
