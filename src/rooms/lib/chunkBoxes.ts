import type {Vec3} from 'math'

import {Box3, Vector3} from 'three/webgpu'

/** The boxes around chunks of air given in the museum’s meters, relative to the room’s origin at `origin`. */
export default function chunkBoxes(chunks: ReadonlyArray<{
  max: Readonly<Vec3>
  min: Readonly<Vec3>
}>, [x, y, z]: Readonly<Vec3>) {
  return chunks.map(({min, max}) => new Box3(new Vector3(min[0] - x, min[1] - y, min[2] - z), new Vector3(max[0] - x, max[1] - y, max[2] - z)))
}
