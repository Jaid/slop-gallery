import type {BufferGeometry} from 'three/webgpu'

import {Float32BufferAttribute} from 'three/webgpu'

/**
 * Maps the wood texture onto every face of a timber piece by its coordinates as they are, 0.7 repeats per meter, with the grain along the `grain` axis.
 *
 * Faces turned toward `grain` show the end grain along the first of their other axes instead.
 */
export default function grainUvs<T extends BufferGeometry>(geometry: T, grain: 0 | 1 | 2) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uvs = new Float32Array(position.count * 2)
  for (let vertex = 0; vertex < position.count; vertex++) {
    const coordinates = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]
    const facing = [normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)].map(Math.abs)
    const axis = facing.indexOf(Math.max(...facing))
    const inFace = [0, 1, 2].filter(i => i !== axis)
    const along = inFace.includes(grain) ? grain : inFace[0]
    const across = inFace.find(i => i !== along)!
    uvs[vertex * 2] = coordinates[across] * 0.7
    uvs[vertex * 2 + 1] = coordinates[along] * 0.7
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}
