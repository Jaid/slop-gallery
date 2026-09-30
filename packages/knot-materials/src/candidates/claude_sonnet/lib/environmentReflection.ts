import type {Node, Texture} from 'three/webgpu'

import {cameraWorldMatrix, float, pmremTexture, positionViewDirection} from 'three/tsl'

/** Direction (world space) that a view-space normal mirrors the eye toward. */
export function reflectedDirection(normalView: Node<'vec3'>) {
  return positionViewDirection.negate().reflect(normalView).transformDirection(cameraWorldMatrix).normalize()
}
/** Blurred radiance of the studio environment seen in the mirror direction of a view-space normal. */
export function environmentReflection(environment: Texture, normalView: Node<'vec3'>, roughness: Node<'float'> | number = 0) {
  return pmremTexture(environment, reflectedDirection(normalView), typeof roughness === 'number' ? float(roughness) : roughness).rgb
}
