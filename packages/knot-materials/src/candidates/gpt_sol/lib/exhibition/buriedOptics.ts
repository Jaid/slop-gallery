import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, float, luminance, materialEnvIntensity, modelNormalMatrix, normalLocal, pmremTexture, positionWorld, tangentGeometry, vec2} from 'three/tsl'

import {TAU} from '../../../../lib/TAU.ts'

/** Snell-bounded parallax in the knot's own UV metric, not in screen pixels. Depth is in object units. */
export function buriedUv(tube: Node<'vec2'>, view: Node<'vec3'>, depth: Node<'float'> | number, ior = 1.5) {
  if (!Number.isFinite(ior) || ior < 1) {
    throw new RangeError('Optical IOR must be finite and at least one.')
  }
  if (typeof depth === 'number' && !Number.isFinite(depth)) {
    throw new RangeError('Optical depth must be finite.')
  }
  const normal = normalLocal.normalize()
  const tangent = tangentGeometry.xyz.sub(normal.mul(tangentGeometry.xyz.dot(normal))).normalize()
  const bitangent = normal.cross(tangent).mul(tangentGeometry.w)
  const lateral = vec2(view.dot(tangent), view.dot(bitangent)).div(ior)
  const transmittedCosine = lateral.dot(lateral).oneMinus().max(0.08).sqrt()
// The analytic centerline speed of the (2, 3) torus knot varies along its length.
  const radius = tube.x.mul(TAU * 3).cos().add(2).mul(0.225)
  const longitudinalMetric = radius.pow2().add(0.3375 ** 2).sqrt().mul(TAU * 2)
  return tube.sub(lateral.div(transmittedCosine).div(vec2(longitudinalMetric, TAU * 0.13)).mul(depth))
}

/** Sparse facets catch actual environment lights, so their highlights stay fixed in the gallery. */
export function reflectedLight(environment: Texture, objectNormal: Node<'vec3'>, roughness = 0.09) {
  const worldNormal = modelNormalMatrix.mul(objectNormal).normalize()
  const incident = positionWorld.sub(cameraPosition).normalize()
  const radiance = pmremTexture(environment, incident.reflect(worldNormal), float(roughness))
  const ambient = luminance(pmremTexture(environment, worldNormal, float(1))).max(0.02)
  const contrast = luminance(radiance).div(ambient)
  return radiance.mul(contrast.smoothstep(1.8, 4.2)).mul(materialEnvIntensity)
}
