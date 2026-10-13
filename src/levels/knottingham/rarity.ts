import type {KnotEntry} from 'knot-materials'

import {knots, special, unknown} from 'knot-materials'
import {knotRarityMode} from 'knot-materials/exhibition.ts'
import KnotRarityEditor from 'knot-materials/KnotRarityEditor.ts'

import {narrate, notify} from '#src/lib/gallery/actions.ts'

export const knotRarityEditor = new KnotRarityEditor(knots)

export function activateKnotSign(entry: KnotEntry) {
  if (knotRarityMode !== 'edit') {
    narrate(`prop-knot-${entry.id}`)
    return
  }
  const value = knotRarityEditor.cycle(entry.id)
  let rating = `${value}/4 stars`
  if (value === unknown) {
    rating = 'unknown'
  } else if (value === special) {
    rating = 'special, only shown on request'
  }
  notify(`${entry.title}: ${rating}`)
}
