import type {Rarity} from './rarities.ts'
import type {KnotEntry} from './types.ts'

export type RarityChange = {
  baseline: Rarity
  candidateId: string
  id: string
  previous: Rarity
  sequence: number
  title: string
  value: Rarity
}

/** Session-local ratings. Selection and world positions deliberately stay fixed while editing. */
export default class KnotRarityEditor {
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private readonly entries: ReadonlyMap<string, KnotEntry>
  private readonly listeners = new Set<() => void>

  private sequence = 0

  private snapshot: ReadonlyMap<string, Rarity>

  constructor(entries: ReadonlyArray<KnotEntry>, private readonly record: (change: RarityChange) => void) {
    this.entries = new Map(entries.map(entry => [entry.id, entry]))
    this.snapshot = new Map(entries.map(entry => [entry.id, entry.rarity]))
  }

  cycle(id: string) {
    const entry = this.entries.get(id)
    if (!entry) {
      throw new Error(`Unknown Knot ID: ${id}`)
    }
    const previous = this.snapshot.get(id)!
    const value = (previous % 4 + 1) as Rarity
    const change: RarityChange = {
      id,
      candidateId: entry.candidateId,
      title: entry.title,
      baseline: entry.rarity,
      previous,
      value,
      sequence: this.sequence + 1,
    }
    // A failed recorder must not appear to accept an edit.
    this.record(change)
    this.sequence = change.sequence
    this.snapshot = new Map(this.snapshot).set(id, value)
    for (const listener of this.listeners) {
      listener()
    }
    return change
  }
}
