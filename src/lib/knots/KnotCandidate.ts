import type {KnotCandidateData, KnotData, KnotEntry} from './types.ts'

const identifier = /^[a-z][0-9_a-z]*$/u
const bySourceId = (a: KnotEntry, b: KnotEntry) => a.sourceId.localeCompare(b.sourceId)

export function indexKnots(candidates: ReadonlyArray<KnotCandidate>) {
  const models = new Set<string>
  const entries = new Map<string, KnotEntry>
  for (const candidate of candidates) {
    if (models.has(candidate.data.id)) {
      throw new Error(`Duplicate Knot candidate: ${candidate.data.id}`)
    }
    models.add(candidate.data.id)
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
        throw new Error(`Invalid or duplicate Knot ID: ${data.id}/${item.id}`)
      }
      if (typeof item.highlighted !== 'boolean') {
        throw new TypeError('Knot highlighted must be a boolean.')
      }
      if (item.displacement !== undefined && (!Number.isFinite(item.displacement) || item.displacement < 0)) {
        throw new Error('Invalid Knot displacement bound.')
      }
      if (!item.author?.model?.title?.trim()) {
        throw new Error('Knot author needs a model title.')
      }
      ids.add(item.id)
      return {
        ...item,
        id: `${data.id}/${item.id}`,
        sourceId: item.id,
        model: data.id,
        modelTitle: item.author.model.title,
        modelIcon: data.icon,
      }
    }).toSorted(bySourceId)
  }
  select(limit?: number) {
    const available = this.items.filter(item => !item.archived)
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw new Error('Knot shot limit must be a positive integer.')
    }
    const prioritized = limit === undefined ? available : [...available.filter(item => item.highlighted), ...available.filter(item => !item.highlighted)].slice(0, limit)
    return prioritized.toSorted((a, b) => Number(a.highlighted) - Number(b.highlighted) || bySourceId(a, b))
  }
}
