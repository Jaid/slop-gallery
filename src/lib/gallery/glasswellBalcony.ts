import {wallOpeningTrim} from './architectureDimensions.ts'
import {glasswellTower} from './glasswellTower.ts'
import {lowerGallery} from './lowerGallery.ts'

const topY = glasswellTower.floorY + glasswellTower.height
const doorwayTopY = lowerGallery.floorY + lowerGallery.tunnel.height + wallOpeningTrim

export const glasswellBalcony = {
  x: lowerGallery.tunnel.x,
  z: lowerGallery.tunnel.northZ,
  topY,
  width: lowerGallery.tunnel.width + 1,
  depth: 1.2,
  thickness: topY - doorwayTopY,
}

export function balconyFloorHeight(x: number, z: number) {
  const dx = (x - glasswellBalcony.x) / (glasswellBalcony.width / 2)
  const dz = (z - glasswellBalcony.z) / glasswellBalcony.depth
  if (dz <= 0 && dx * dx + dz * dz <= 1) {
    return glasswellBalcony.topY
  }
}
