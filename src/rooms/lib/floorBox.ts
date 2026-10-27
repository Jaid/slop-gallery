import type {FloorSize} from '../base/Room.ts'

import {Box3, Vector3} from 'three/webgpu'

/** The box over a floor rectangle of the size, from `bottom` up by `height`, centered on the room’s origin or on `center` (x and z) relative to it. */
export default function floorBox([width, depth]: FloorSize, bottom: number, height: number, [x, z]: readonly [number, number] = [0, 0]) {
  return new Box3(new Vector3(x - width / 2, bottom, z - depth / 2), new Vector3(x + width / 2, bottom + height, z + depth / 2))
}
