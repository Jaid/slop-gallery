import type {Light, NodeBuilder, NodeMaterial} from 'three/webgpu'

import {LightsNode} from 'three/webgpu'

/** Whether a light reaches enclosed rooms. The gallery’s sun is not shadowed that far out, so it would shine through every ceiling. */
export const reachesIndoors = (light: Light) => !(light as Light & {isDirectionalLight?: boolean}).isDirectionalLight

/**
 * Lights a material with every scene light except directional ones.
 *
 * Assign one instance per material as its `lightsNode`. The renderer hands each build the scene’s own lights node, and rebuilds materials whenever the scene’s lights change. This node copies the indoor lights from it at the start of every build, so lights can mount and unmount freely.
 */
export default class IndoorLightsNode extends LightsNode {
  // Lighting is only set up for nodes that report lights; the actual list is known once the material builds.
  override get hasLights() {
    return true
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
      this.setLights(scene.getLights().filter(reachesIndoors))
    }
  }
}

const shared = new IndoorLightsNode

/** Lets the materials of an enclosed space ignore the gallery’s sun, returning them for chaining. */
export function lightIndoors<T extends NodeMaterial>(material: T) {
  material.lightsNode = shared
  return material
}
