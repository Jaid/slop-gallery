import type KnotMaterial from '../lib/KnotMaterial.ts'

import KnotMaterials from './base/KnotMaterials.ts'

/**
 * Full materials without placeholders or a warmup of their own: a knot wears its material as soon as its shader arrived, and building and compiling it is left to the renderer, like for anything else in the scene.
 * The shaders load with the first subscription, which a scene makes once it mounted the knots; until then, and while a shader downloads, the snapshot has no material for its knot.
 */
export default class DirectKnotMaterials extends KnotMaterials {
  /** the full materials of the knots whose shaders have arrived, by entry index, as a new array whenever one arrives */
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    for (const index of this.entries.keys()) {
      this.request(index)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }
  private readonly listeners = new Set<() => void>
  private snapshot: ReadonlyArray<KnotMaterial | undefined> = [...this.fullMaterials]

  /** the ids of the knots whose shaders are still downloading */
  get pendingMaterials() {
    return this.entries.filter((_, index) => this.isLoading(index)).map(entry => entry.id)
  }

  protected wear() {
    this.snapshot = [...this.fullMaterials]
    for (const listener of this.listeners) {
      listener()
    }
  }
}
