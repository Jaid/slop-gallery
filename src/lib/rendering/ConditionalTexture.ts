import type {Node, NodeFrame} from 'three/webgpu'

import {RTTNode} from 'three/webgpu'

/** Retain the render graph and texture ownership without submitting inactive effect passes. */
export default class ConditionalTexture extends RTTNode {
  constructor(node: Node<'vec4'>, private readonly enabled: () => boolean, resolutionScale = 1) {
    super(node, null, null, {
      depthBuffer: false,
      resolutionScale,
    })
  }

  override updateBefore(frame: NodeFrame): boolean | undefined {
    if (this.enabled()) {
      return super.updateBefore(frame)
    }
    return undefined
  }
}
