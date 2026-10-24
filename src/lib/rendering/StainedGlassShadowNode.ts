import type Node from 'three/src/nodes/core/Node.js'
import type {DirectionalLight, LightShadow, NodeBuilder, Texture} from 'three/webgpu'

import {int, interleavedGradientNoise, min, positionWorld, reference, screenCoordinate, texture, vec3, vogelDiskSample} from 'three/tsl'
import {ShadowNode} from 'three/webgpu'

/** the alpha that stained glass writes into the color of a shadow map, telling its texels from those of opaque casters */
export const stainedGlassMarker = 0.5
/** lookups of the glass’ color per pixel, spread over the same disk as the shadow’s own filter */
const colorSamples = 12

type FilterInputs = {
  shadow: LightShadow
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

  /**
   * Glass writes depth, so the depth comparison counts the lookups that fall on glass as shadowed. Each of those adds back the glass’ color instead,
   * taken on the shadow filter’s disk, so the colored light blurs at the same width as the shadow’s edges rather than showing the map’s texels.
   */
  setupShadowFilter(builder: NodeBuilder, inputs: FilterInputs) {
    const shadow = setupShadowFilter.call(this, builder, inputs)
    const {shadowCoord, shadowTexture} = inputs
    const spread = reference('radius', 'float', inputs.shadow).div(reference('mapSize', 'vec2', inputs.shadow).x)
    // Rotated per pixel like the shadow’s own disk, so the temporal resolve averages the pattern out.
    const phi = interleavedGradientNoise(screenCoordinate.xy).mul(Math.PI * 2)
    const tint = Array.from({length: colorSamples}, (_, index) => {
      const color = texture(shadowTexture, shadowCoord.xy.add(vogelDiskSample(int(index), int(colorSamples), phi).mul(spread)))
      return color.a.sub(stainedGlassMarker).abs().lessThan(0.25).select(color.rgb, vec3(0))
    }).reduce((sum, sample) => sum.add(sample)).div(colorSamples)
    return this.receives(positionWorld).select(min(vec3(shadow).add(tint), vec3(1)), vec3(shadow))
  }
}
