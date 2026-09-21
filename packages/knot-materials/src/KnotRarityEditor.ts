import type {Rarity} from './rarities.ts'
import type {KnotEntry} from './types.ts'

import {ethereal, unknown} from './rarities.ts'

/** Session-local ratings. Selection and world positions deliberately stay fixed while editing. */
export default class KnotRarityEditor {
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private readonly listeners = new Set<() => void>

  private snapshot: ReadonlyMap<string, Rarity>

  constructor(entries: ReadonlyArray<KnotEntry>) {
    this.snapshot = new Map(entries.map(entry => [entry.id, entry.rarity]))
  }

  cycle(id: string) {
    const previous = this.snapshot.get(id)
    if (previous === undefined) {
      throw new Error(`Unknown Knot ID: ${id}`)
    }
    const value = (previous === ethereal ? unknown : previous + 1) as Rarity
    const snapshot = new Map(this.snapshot)
    snapshot.set(id, value)
    this.snapshot = snapshot
    for (const listener of this.listeners) {
      listener()
    }
    return value
  }
}
