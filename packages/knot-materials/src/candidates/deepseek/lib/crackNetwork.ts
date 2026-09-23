import type {Node} from 'three/webgpu'

import {mx_fractal_noise_vec3, mx_worley_noise_vec3} from 'three/tsl'

/**
 * A warped Voronoi partition, in cell units, as used for fracture, frost, crazing and tarnish.
 *
 * `edge` is the distance to the cell boundary: zero on a seam and growing toward the cell's heart,
 * which makes it a natural signed field for `surfaceLine`. `heart` is the distance to the cell's
 * nearest feature point, so its square shapes a smooth dome across each cell. Warping the lookup
 * bends the straight Voronoi walls into the irregular, branching paths of natural fracture.
 */
export function crackNetwork(p: Node<'vec3'>, cellScale: number, warpScale: number, warpStrength = 0.5) {
  const warp = mx_fractal_noise_vec3(p.mul(warpScale), 3, 2.1, 0.5).mul(warpStrength)
  const distances = mx_worley_noise_vec3(p.mul(cellScale).add(warp), 1, 0)
  return {
    edge: distances.y.sub(distances.x),
    heart: distances.x,
  }
}
