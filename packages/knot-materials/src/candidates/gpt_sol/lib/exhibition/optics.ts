import type {Node} from 'three/webgpu'

import {bitangentView, normalViewGeometry, tangentView, vec3} from 'three/tsl'

/** Smooth spectral lobes in linear light. The input is an artistic wavelength in nanometers. */
export function wavelength(nm: Node<'float'>) {
  const red = nm.sub(625).div(46).pow2().negate().exp().add(nm.sub(420).div(27).pow2().negate().exp().mul(0.2))
  const green = nm.sub(535).div(38).pow2().negate().exp()
  const blue = nm.sub(455).div(31).pow2().negate().exp()
  return vec3(red, green, blue).add(0.018)
}

/** Facet slopes in the knot’s smooth UV frame; remains attached to the object as the camera moves. */
export function facetNormal(slope: Node<'vec2'>) {
  const B = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  return normalViewGeometry.sub(tangentView.normalize().mul(slope.x)).sub(B.mul(slope.y)).normalize()
}
