import type {Light, NodeBuilder, NodeMaterial, Texture} from 'three/webgpu'

import {LightsNode} from 'three/webgpu'

/**
 * Lights a material with the subset of scene lights that {@link admits} accepts.
 *
 * Assign one instance as the `lightsNode` of every material that shares the lighting, through {@link adopt}. The renderer hands each build the scene’s own lights node, and rebuilds materials whenever the scene’s lights change. This node copies the admitted lights from it at the start of every build, so lights can mount and unmount freely.
 */
export default abstract class FilteredLightsNode extends LightsNode {
  /** what adopted materials reflect and are softly lit by instead of the scene’s environment, if set */
  readonly environment?: Texture
  /** replaces each adopted material’s `envMapIntensity` when {@link environment} is set */
  readonly environmentIntensity?: number

  // Lighting is only set up for nodes that report lights; the actual list is known once the material builds.
  override get hasLights() {
    return true
  }

  /** Whether a scene light reaches the surfaces lit by this node. */
  abstract admits(light: Light): boolean

  /** Lets a material use this node’s lights and environment, returning it for chaining. */
  adopt<T extends NodeMaterial>(material: T) {
    material.lightsNode = this
    const reflective = material as T & {
      envMap?: Texture | null
      envMapIntensity?: number
    }
    if (this.environment && 'envMapIntensity' in reflective) {
      reflective.envMap = this.environment
      reflective.envMapIntensity = this.environmentIntensity ?? reflective.envMapIntensity
    }
    return material
  }

  override getHash(builder: NodeBuilder) {
    this.sync(builder)
    return super.getHash(builder)
  }

  override setup(builder: NodeBuilder) {
    this.sync(builder)
    return super.setup(builder)
  }

  private sync(builder: NodeBuilder) {
    const scene = (builder as NodeBuilder & {lightsNode: LightsNode | null}).lightsNode
    if (scene && scene !== this) {
      this.setLights(scene.getLights().filter(light => this.admits(light)))
    }
  }
}
