import type {Light, NodeBuilder} from 'three/webgpu'

import {Lighting, LightsNode, NodeUtils, PointLight} from 'three/webgpu'

import PointLightsNode from './PointLightsNode.ts'

type Batch = 'point'

// Uniform arrays have a fixed length per build; the gallery has about 50 shadowless point lights.
const capacity = 128
/** The batch that shades a light, if any. Shadow casters and every other kind of light keep a node of their own. */
const batchOf = (light: Light): Batch | undefined => {
  if (light.castShadow) {
    return undefined
  }
  return light.constructor === PointLight ? 'point' : undefined
}

/**
 * Lights materials like {@link LightsNode}, but shades shadowless point lights in one loop through {@link PointLightsNode}.
 *
 * Batched lights also stay out of the cache key: the batches read their members every frame, so lights can move, mount and unmount without rebuilding any material, as long as their batch already exists.
 */
export default class BatchedLightsNode extends LightsNode {
  private readonly batches = new Map<Batch, PointLightsNode>
  private readonly own: Array<Light> = []

  /** Sets up the loop for a batch, if not done yet. */
  protected addBatch(batch: Batch) {
    if (!this.batches.has(batch)) {
      this.batches.set(batch, new PointLightsNode(capacity, () => this.membersOf(batch)))
    }
  }

  // The batched lights belong to this instance’s uniform arrays, so materials lit by another lights node must not share its builds.
  override customCacheKey() {
    return NodeUtils.hashArray([super.customCacheKey(), this.id, this.batches.size])
  }

  override getBuiltinLights() {
    return this.own
  }

  /** The lights the batches read every frame. */
  protected liveLights(): Iterable<Light> {
    return this.getLights()
  }

  override setLights(lights: Array<Light>) {
    super.setLights(lights)
    this.own.length = 0
    for (const light of lights) {
      const batch = batchOf(light)
      if (batch) {
        this.addBatch(batch)
      } else {
        this.own.push(light)
      }
    }
    return this
  }

  override setupLightsNode(builder: NodeBuilder) {
    return [...super.setupLightsNode(builder), ...this.batches.values()]
  }

  private *membersOf(batch: Batch) {
    for (const light of this.liveLights()) {
      if (batchOf(light) === batch) {
        yield light as PointLight
      }
    }
  }
}

/** Gives every scene a {@link BatchedLightsNode}. */
export class BatchedLighting extends Lighting {
  override createNode(lights: Array<Light> = []) {
    const node = new BatchedLightsNode
    return node.setLights(lights)
  }
}
