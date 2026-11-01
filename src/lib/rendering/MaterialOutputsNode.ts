import type {NodeBuilder} from 'three/webgpu'

import {output} from 'three/tsl'
import {MRTNode, Node} from 'three/webgpu'

/**
 * MRT outputs a material writes through its `mrtNode` over those of the gallery’s render pipeline, which merges them in, like its own weight for the screen-space reflections or geometry buffers that leave the surface behind it alone. Its color always goes to `output` as usual.
 *
 * Rendered into a target without these buffers, like a capture target or the canvas, the material writes its color alone.
 */
export default class MaterialOutputsNode extends MRTNode {
  constructor(outputs: Record<string, Node>) {
    super({
      output,
      ...outputs,
    })
  }

  override setup(builder: NodeBuilder) {
    const target = builder.renderer.getRenderTarget()
    if (target?.textures.some(texture => texture.name in this.outputNodes)) {
      return super.setup(builder)
    }
    // The builder keeps the struct output for every MRT node; a target without named outputs gets the color at its first attachment.
    this.members = [output.convert((builder as NodeBuilder & {getOutputType: (index: number) => string}).getOutputType(0))]
    const plain = Node.prototype as Node
    return plain.setup.call(this, builder)
  }
}
