import type {Node} from 'three/webgpu'

import {normalView, vec4, velocity} from 'three/tsl'

import MaterialOutputsNode from './MaterialOutputsNode.ts'

/**
 * MRT outputs for a soft, depth-less transparent sprite, like a water droplet or a puff of mist: its color blends as usual, but its geometry buffers carry alpha 0, so the normal and motion of the surface behind it stay in place.
 *
 * Without this, the sprite’s whole quad – including the fully transparent part around the soft disc – writes its camera-facing normal over the background’s, and the ambient occlusion, reading that normal against the background’s depth, darkens the quad to a black rectangle.
 */
export default class TransparentSpriteOutputsNode extends MaterialOutputsNode {
  constructor() {
    super({
      normal: vec4(normalView, 0),
      // The velocity node’s declaration lacks the node extensions every other node has.
      velocity: vec4(velocity as unknown as Node<'vec2'>, 0, 0),
      diffuseColor: vec4(0),
    })
  }
}
