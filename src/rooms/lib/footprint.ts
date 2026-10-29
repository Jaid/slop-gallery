import type {FootprintInput} from 'geofency'
import type {Box3} from 'three/webgpu'

/** The rectangle on the ground that covers every box, as the footprint of a geofence’s box. */
export default function footprint(boxes: ReadonlyArray<Box3>): FootprintInput {
  return {
    x: Math.min(...boxes.map(box => box.min.x)),
    z: Math.min(...boxes.map(box => box.min.z)),
    x2: Math.max(...boxes.map(box => box.max.x)),
    z2: Math.max(...boxes.map(box => box.max.z)),
  }
}
