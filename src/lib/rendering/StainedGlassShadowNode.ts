import type Node from 'three/src/nodes/core/Node.js'
import type {DirectionalLight, NodeBuilder, Texture} from 'three/webgpu'

import {mix, positionWorld, texture, vec3} from 'three/tsl'
import {ShadowNode} from 'three/webgpu'

/** the alpha that stained glass writes into the color of a shadow map, telling its texels from those of opaque casters */
export const stainedGlassMarker = 0.5

type FilterInputs = {
  shadowCoord: Node<'vec3'>
  shadowTexture: Texture
}
/** Three’s typings leave out the hook that turns the depth comparison into the shadow’s strength. */
const {setupShadowFilter} = ShadowNode.prototype as unknown as {setupShadowFilter: (this: ShadowNode, builder: NodeBuilder, inputs: FilterInputs) => Node<'float'>}

/**
 * A directional light’s shadow that lets stained glass tint the light passing through it.
 *
 * Three’s transmitted shadows do this for every light of the renderer, but the color of a shadow map holds a single layer: the glass’ tint would reach every receiver deeper in its shadow too, through floors and into the tunnels below. Here the tint only reaches receivers that `receives` admits, while all others get the plain shadow.
 */
export default class StainedGlassShadowNode extends ShadowNode {
  private readonly receives: (position: Node<'vec3'>) => Node<'bool'>

  constructor(light: DirectionalLight, receives: (position: Node<'vec3'>) => Node<'bool'>) {
    super(light, light.shadow)
    this.receives = receives
  }

  setupShadowFilter(builder: NodeBuilder, inputs: FilterInputs) {
    const shadow = setupShadowFilter.call(this, builder, inputs)
    const color = texture(inputs.shadowTexture, inputs.shadowCoord.xy)
    const glass = color.a.sub(stainedGlassMarker).abs().lessThan(0.25).and(this.receives(positionWorld))
    return glass.select(mix(color.rgb, vec3(1), shadow), vec3(shadow))
  }
}
