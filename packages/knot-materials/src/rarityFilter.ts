import type {Rarity} from './rarities.ts'

import {common, ethereal, prime, rare, unknown} from './rarities.ts'

export type RarityName = 'common' | 'ethereal' | 'prime' | 'rare' | 'unknown'

const byName = {
  unknown,
  common,
  rare,
  prime,
  ethereal,
} as const satisfies Record<RarityName, Rarity>

export default function parseRarityFilter(search = ''): ReadonlySet<Rarity> | undefined {
  const params = new URLSearchParams(search)
  const raw = params.getAll('rarity_filter')
  if (!raw.length) {
    return
  }
  const tokens = raw.flatMap(value => value.split(',')).map(value => value.trim())
  if (!tokens.length || tokens.some(value => !value)) {
    throw new Error('Knot rarity_filter URL parameter must be a comma-separated list of rarity integers or names.')
  }
  const values = tokens.map(token => {
    if (/^[0-4]$/u.test(token)) {
      return Number(token) as Rarity
    }
    if (Object.hasOwn(byName, token)) {
      return byName[token as RarityName]
    }
    throw new Error('Knot rarity_filter URL parameter accepts only 0–4 or unknown, common, rare, prime, ethereal.')
  })
  return new Set(values)
}
