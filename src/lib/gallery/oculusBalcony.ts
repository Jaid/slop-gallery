import {wallOpeningTrim} from './architectureDimensions.ts'
import lowerGallery from './lowerGallery.ts'
import oculusTower from './oculusTower.ts'

const topY = oculusTower.floorY + oculusTower.height
// The balcony stays at the viewing deck’s original elevation and thickness; the lowered doorway no longer touches its underside.
const originalDoorwayTopY = lowerGallery.floorY + lowerGallery.tunnel.height + wallOpeningTrim
const oculusBalcony = {
  x: lowerGallery.tunnel.x,
  z: lowerGallery.tunnel.northZ,
  topY,
  width: lowerGallery.tunnel.width + 1,
  depth: 1.2,
  thickness: topY - originalDoorwayTopY,
}

export function balconyFloorHeight(x: number, z: number) {
  const dx = (x - oculusBalcony.x) / (oculusBalcony.width / 2)
  const dz = (z - oculusBalcony.z) / oculusBalcony.depth
  if (dz <= 0 && dx * dx + dz * dz <= 1) {
    return oculusBalcony.topY
  }
}

export default oculusBalcony
