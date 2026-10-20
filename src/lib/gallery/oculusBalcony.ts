import type {Vec3} from './types.ts'

import lowerGallery, {oculusBalconyDepth as depth} from './lowerGallery.ts'
import oculusTower from './oculusTower.ts'

const {center, size} = lowerGallery.oculus
const topY = oculusTower.floorY + oculusTower.height
const thickness = 0.3
/** A walkable ledge along the whole south wall, level with the tower’s deck. */
const oculusBalcony: {
  position: Vec3
  size: Vec3
} = {
  position: [center[0], topY - thickness / 2, center[1] + size[1] / 2 - depth / 2],
  size: [size[0], thickness, depth],
}

export function balconyFloorHeight(x: number, z: number) {
  const {position, size: [width, height, length]} = oculusBalcony
  if (Math.abs(x - position[0]) <= width / 2 && Math.abs(z - position[2]) <= length / 2) {
    return position[1] + height / 2
  }
}

export default oculusBalcony
