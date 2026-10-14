import type {Node, NodeFrame, TextureNode} from 'three/webgpu'

import GaussianBlurNode from 'three/addons/tsl/display/GaussianBlurNode.js'

/** Skip both Gaussian passes outside zoom, including its enter/exit transition. */
export default class ZoomBlur extends GaussianBlurNode {
  constructor(source: TextureNode, amount: Node<'float'>, private readonly enabled: () => boolean) {
    super(source, amount.mul(0.75), 8, {resolutionScale: 1})
  }

  override updateBefore(frame: NodeFrame) {
    if (this.enabled()) {
      return super.updateBefore(frame)
    }
  }
}
