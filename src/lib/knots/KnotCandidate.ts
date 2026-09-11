import type {KnotCandidateData, KnotData, KnotEntry} from './types.ts'

export const defaultKnotDisplayLimit = 8
const identifier = /^[a-z][0-9_a-z]*$/u

export function indexKnots(candidates: ReadonlyArray<KnotCandidate>) {
  const models = new Set<string>
  const numbers = new Map<number, KnotEntry>
  for (const candidate of candidates) {
    if (models.has(candidate.data.id)) {
      throw new Error(`Duplicate Knot candidate: ${candidate.data.id}`)
    }
    models.add(candidate.data.id)
    for (const item of candidate.items) {
      if (numbers.has(item.number)) {
        throw new Error(`Duplicate Knot number: ${item.number}`)
      }
      numbers.set(item.number, item)
    }
  }
  return numbers
}

export class KnotCandidate {
  readonly items: ReadonlyArray<KnotEntry>
  constructor(readonly data: KnotCandidateData, items: ReadonlyArray<KnotData>) {
    if (!identifier.test(data.id)) {
      throw new Error(`Invalid Knot candidate ID: ${data.id}`)
    }
    const ids = new Set<string>
    const numbers = new Set<number>
    this.items = items.map(item => {
      if (!identifier.test(item.id) || ids.has(item.id)) {
        throw new Error(`Invalid or duplicate Knot ID: ${data.id}/${item.id}`)
      }
      if (!Number.isSafeInteger(item.number) || item.number < 1 || numbers.has(item.number)) {
        throw new Error(`Invalid or duplicate Knot number: ${item.number}`)
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
      numbers.add(item.number)
      return {
        ...item,
        id: `${data.id}/${item.id}`,
        sourceId: item.id,
        model: data.id,
        modelTitle: item.author.model.title,
        modelIcon: data.icon,
      }
    })
    this.validateLimit(data.displayLimit ?? defaultKnotDisplayLimit)
  }
  select(limit = this.data.displayLimit ?? defaultKnotDisplayLimit) {
    this.validateLimit(limit)
    // Retain favorites first, favor newer submissions on ties, then restore plate-number order.
    return this.items.filter(item => !item.archived).toSorted((a, b) => Number(b.highlighted) - Number(a.highlighted) || b.number - a.number).slice(0, limit).sort((a, b) => a.number - b.number)
  }
  private validateLimit(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 0) {
      throw new RangeError('Knot display limit must be a nonnegative safe integer.')
    }
  }
}
