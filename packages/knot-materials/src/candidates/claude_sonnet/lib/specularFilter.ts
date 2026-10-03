import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** Geometric specular antialiasing for procedural shading normals (Tokuyoshi and Kaplanyan 2019). The built-in geometry roughness only sees the smooth mesh normal, so spikes, facets and ridges smaller than a pixel would glitter. The lobe widens by the screen-space variance of the shading normal, capped so close views stay crisp. Takes and returns perceptual roughness. */
export function filteredRoughness(roughness: Node<'float'> | number, normal: Node<'vec3'>, limit = 0.18) {
  const base = typeof roughness === 'number' ? float(roughness) : roughness
  const dx = normal.dFdx()
  const dy = normal.dFdy()
  const kernel = dx.dot(dx).add(dy.dot(dy)).mul(0.125).min(limit)
  // perceptual roughness r → GGX alpha r², and the filter adds to alpha²
  return base.pow(4).add(kernel).min(1).pow(0.25)
}
