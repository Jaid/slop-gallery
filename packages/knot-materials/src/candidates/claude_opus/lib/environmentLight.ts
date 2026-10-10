import type {Node, Texture} from 'three/webgpu'

import {float, luminance, modelWorldMatrix, pmremTexture, vec4} from 'three/tsl'

/** An object-space direction in world space; the environment is indexed in world space. */
export function toWorldDirection(direction: Node<'vec3'>) {
  return modelWorldMatrix.mul(vec4(direction, 0)).xyz.normalize()
}
/** Prefiltered room radiance arriving from an object-space direction, blurred to `roughness`. */
export function environmentRadiance(environment: Texture, direction: Node<'vec3'>, roughness: Node<'float'> | number) {
  return pmremTexture(environment, toWorldDirection(direction), typeof roughness === 'number' ? float(roughness) : roughness).rgb
}
/**
 * How strongly a direction stands out from the room’s average – near 0 for dim walls, above 1 for softboxes and windows.
 * Lets procedural optics flash where real lights are, whatever room the gallery places the piece in.
 */
export function environmentContrast(environment: Texture, direction: Node<'vec3'>, roughness: Node<'float'> | number) {
  const sharp = luminance(environmentRadiance(environment, direction, roughness))
  const ambient = luminance(environmentRadiance(environment, direction, 1)).max(0.02)
  return sharp.div(ambient)
}
