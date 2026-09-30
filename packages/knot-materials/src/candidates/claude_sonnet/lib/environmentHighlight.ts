import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, float, luminance, modelWorldMatrix, pmremTexture, positionWorld, vec4} from 'three/tsl'

/** An object-space direction in world space (the environment is sampled in world space). */
export function toWorldDirection(direction: Node<'vec3'>) {
  return modelWorldMatrix.mul(vec4(direction, 0)).xyz.normalize()
}
/** The room's average radiance around an object-space normal – a reference level for relative brightness. */
export function ambientRadiance(environment: Texture, normal: Node<'vec3'>) {
  return luminance(pmremTexture(environment, toWorldDirection(normal), float(1))).max(0.02)
}
/** The environment mirrored by an object-space normal, keeping only what stands out above the room's average. Polished metal reads as metal through contrast: bright, crisp images of light sources over dim surroundings. Gallery environments are often soft and even, so this isolates their light sources for an emissive highlight layer. `offset` rotates the reflected direction slightly – different offsets per channel imitate a gem's dispersion. */
export function environmentHighlight(environment: Texture, normal: Node<'vec3'>, roughness: Node<'float'> | number, {threshold = 1.3, offset}: {
  offset?: Node<'vec3'>
  threshold?: number
} = {}) {
  const incident = positionWorld.sub(cameraPosition).normalize()
  let reflected = incident.reflect(toWorldDirection(normal))
  if (offset) {
    reflected = reflected.add(offset).normalize()
  }
  const radiance = pmremTexture(environment, reflected, typeof roughness === 'number' ? float(roughness) : roughness)
  const contrast = luminance(radiance).div(ambientRadiance(environment, normal))
  return radiance.mul(contrast.sub(threshold).max(0).div(contrast.max(0.001)))
}
/** A jeweler's light-tent reflection: a bright overhead band and a dark floor, seen in the mirror direction of an object-space normal. Soft gallery rooms give polished metal too little contrast to read as metal; this restores the dark/bright alternation. */
export function studioSheen(normal: Node<'vec3'>) {
  const incident = positionWorld.sub(cameraPosition).normalize()
  const reflected = incident.reflect(toWorldDirection(normal))
  const overhead = reflected.y.smoothstep(0.15, 0.75)
  const horizon = reflected.y.sub(0.05).abs().smoothstep(0, 0.06).oneMinus()
  return overhead.mul(overhead).mul(0.8).add(horizon.mul(0.7))
}
