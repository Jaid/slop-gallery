/** Object-space surface frame. The published bitangent accessors are typed as bare MathNode, so every vector helper in this gallery goes through here to get a properly typed frame. */
/** Object-space surface frame. The published bitangent accessors are typed as bare MathNode, so every vector helper in this gallery goes through here to get a properly typed frame. */
import type {Node} from 'three/webgpu'

import {bitangentLocal, tangentLocal, vec3} from 'three/tsl'

export function surfaceFrame() {
  const tangent = vec3(tangentLocal).normalize()
  const bitangent = vec3(bitangentLocal as unknown as Node<'vec3'>).normalize()
  return {
    bitangent,
    tangent,
  }
}
