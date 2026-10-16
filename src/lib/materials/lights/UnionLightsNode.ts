import type {Light, Texture} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'

/** Every light any of the given nodes admits, for surfaces between two differently lit spaces, like a window and its reveal. */
export default class UnionLightsNode extends FilteredLightsNode {
  override readonly environment?: Texture
  private readonly parts: ReadonlyArray<FilteredLightsNode>

  constructor(parts: ReadonlyArray<FilteredLightsNode>, {environment}: {environment?: Texture} = {}) {
    super()
    this.parts = parts
    this.environment = environment
  }

  admits(light: Light) {
    return this.parts.some(part => part.admits(light))
  }
}
