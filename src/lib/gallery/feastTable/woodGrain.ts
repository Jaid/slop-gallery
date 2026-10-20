import type {BufferGeometry} from 'three/webgpu'

import {Float32BufferAttribute, Vector3} from 'three/webgpu'

export type Fiber = 'x' | 'y' | 'z'

const axes: Record<Fiber, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

/**
 * Bakes the `woodGrain` attribute read by `WalnutMaterial` into a piece of timber in its final position: meters along the fibers, the distance from the log’s pith in meters and the piece’s seed (0–1).
 *
 * The pith runs parallel to the fibers through `pith`. Its distance makes the growth rings run along the faces of a board, curve into arcs on its end grain and turn into bands wherever a turned leg swells or narrows, as they do in real timber. `along` starts at a different place for every seed, so pieces cut side by side never repeat the same figure.
 */
export function withGrain<T extends BufferGeometry>(geometry: T, fiber: Fiber, pith: Vector3, seed: number) {
  const axis = axes[fiber]
  const position = geometry.getAttribute('position')
  const grain = new Float32Array(position.count * 3)
  const point = new Vector3
  const offset = new Vector3
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index)
    const along = point.dot(axis)
    offset.subVectors(point, pith)
    offset.addScaledVector(axis, -offset.dot(axis))
    grain.set([along + seed * 7.3, offset.length(), seed], index * 3)
  }
  geometry.setAttribute('woodGrain', new Float32BufferAttribute(grain, 3))
  return geometry
}

const crossAxes: Record<Fiber, readonly [Vector3, Vector3]> = {
  x: [axes.y, axes.z],
  y: [axes.x, axes.z],
  z: [axes.x, axes.y],
}

/**
 * Where the pith of a sawn board lies: well outside it, in a direction across the fibers that varies from piece to piece, so neighbors show the rings at different curvatures.
 */
export function boardPith(center: Vector3, fiber: Fiber, seed: number, distance = 0.35) {
  const angle = seed * Math.PI * 2
  const [a, b] = crossAxes[fiber]
  return center.clone().addScaledVector(a, Math.cos(angle) * distance * 0.4).addScaledVector(b, -distance * (0.8 + 0.4 * Math.abs(Math.sin(angle))))
}

/** A deterministic sequence of seeds in [0, 1), spread evenly by the golden ratio. */
export class GrainSeeds {
  private index: number

  constructor(start = 0) {
    this.index = start
  }

  next() {
    this.index++
    return this.index * 0.618034 % 1
  }
}
