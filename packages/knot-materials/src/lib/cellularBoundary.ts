import type {Node} from 'three/webgpu'

import {mx_worley_noise_vec3} from 'three/tsl'

/** Continuous Voronoi cell boundaries from the distance between the nearest two features. */
export function cellularBoundary(position: Node<'vec3'>) {
  const distances = mx_worley_noise_vec3(position, 1, 0)
  return distances.y.sub(distances.x)
}
