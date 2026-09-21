import type {Rarity} from './rarities.ts'
import type {KnotCandidateData, KnotData, KnotEntry, KnotId} from './types.ts'

import rarities from './rarities.ts'

const identifier = /^[a-z][0-9_a-z]*$/u
const byId = (a: KnotEntry, b: KnotEntry) => a.id.localeCompare(b.id)

export function indexKnots(candidates: ReadonlyArray<KnotCandidate>) {
  const candidateIds = new Set<string>
  const entries = new Map<string, KnotEntry>
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.data.id)) {
      throw new Error(`Duplicate Knot candidate: ${candidate.data.id}`)
    }
    candidateIds.add(candidate.data.id)
    for (const item of candidate.items) {
      if (entries.has(item.id)) {
        throw new Error(`Duplicate Knot ID: ${item.id}`)
      }
      entries.set(item.id, item)
    }
  }
  return entries
}

export default class KnotCandidate {
  readonly items: ReadonlyArray<KnotEntry>

  constructor(readonly data: KnotCandidateData, items: ReadonlyArray<KnotData>) {
    if (!identifier.test(data.id)) {
      throw new Error(`Invalid Knot candidate ID: ${data.id}`)
    }
    const ids = new Set<string>
    this.items = items.map(item => {
      if (!identifier.test(item.id) || ids.has(item.id)) {
        throw new Error(`Invalid or duplicate Knot ID: ${item.id}`)
      }
      if (item.candidateId !== data.id) {
        throw new Error(`Knot ${item.id} belongs to ${item.candidateId}, not ${data.id}.`)
      }
      if (item.displacement !== undefined && (!Number.isFinite(item.displacement) || item.displacement < 0)) {
        throw new Error('Invalid Knot displacement bound.')
      }
      if (!item.author.model.title.trim()) {
        throw new Error('Knot author needs a model title.')
      }
      if (!Object.hasOwn(rarities, item.id)) {
        throw new Error(`Missing Knot rarity: ${item.id}`)
      }
      const rarity = rarities[item.id as KnotId]
      ids.add(item.id)
      return {
        ...item,
        candidate: data,
        modelTitle: item.author.model.title,
        rarity,
      }
    }).toSorted(byId)
  }

  select(limit?: number, useRarity = true, rarityFilter?: ReadonlySet<Rarity>) {
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw new Error('Knot shot limit must be a positive integer.')
    }
    const available = this.items.filter(item => !item.archived && (!rarityFilter || rarityFilter.has(item.rarity)))
    if (!useRarity) {
      return limit === undefined ? available : available.slice(0, limit)
    }
    const prioritized = available.toSorted((a, b) => b.rarity - a.rarity || byId(a, b))
    return (limit === undefined ? prioritized : prioritized.slice(0, limit)).toSorted((a, b) => a.rarity - b.rarity || byId(a, b))
  }
}
