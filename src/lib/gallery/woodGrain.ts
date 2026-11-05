import type {BufferGeometry} from 'three/webgpu'

import {Float32BufferAttribute} from 'three/webgpu'

/** how far along a piece’s fibers and how far across them a point of it lies, by where it lies in the piece’s own frame */
export type GrainMapping = (x: number, y: number, z: number) => readonly [along: number, across: number]

/** Bakes the grain of a piece of wood, as it lies in its own frame, into the `woodGrain` attribute (along, across, seed) read by `GrainedWoodMaterial`, returning the piece. */
export function withWoodGrain<T extends BufferGeometry>(geometry: T, mapping: GrainMapping, seed: number) {
  const position = geometry.getAttribute('position')
  const grain = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index++) {
    const [along, across] = mapping(position.getX(index), position.getY(index), position.getZ(index))
    grain.set([along, across, seed], index * 3)
  }
  geometry.setAttribute('woodGrain', new Float32BufferAttribute(grain, 3))
  return geometry
}
