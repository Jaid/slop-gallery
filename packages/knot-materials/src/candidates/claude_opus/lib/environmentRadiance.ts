import type {Node, Texture} from 'three/webgpu'

import {float, modelWorldMatrix, pmremTexture} from 'three/tsl'

/**
 * Prefiltered radiance of the gallery environment along an object-space direction.
 * Lets hand-made optics (diffraction, internal reflections) answer to the same light as the PBR lobes.
 */
export function environmentRadiance(environment: Texture, objectDirection: Node<'vec3'>, roughness: Node<'float'> | number = 0.3) {
  const world = objectDirection.transformDirection(modelWorldMatrix).normalize()
  return pmremTexture(environment, world, typeof roughness === 'number' ? float(roughness) : roughness).rgb
}
