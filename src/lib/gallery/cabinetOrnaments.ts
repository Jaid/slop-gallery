import {wallFace, wallOpeningTrim} from './architecture.ts'
import {wallOrnament, wallOrnamentPositions} from './WallOrnamentGeometry.ts'
import {wallPosition, walls} from './walls.ts'

export const cabinetOrnaments = walls.filter(wall => wall.room === 'cabinet').flatMap(wall => {
  const positions = wallOrnamentPositions(wall)
  if (wall.id === 'cabinet-south') {
    // Leave the wall beside the Amber Room doorway undecorated.
    positions.shift()
  }
  const doorway = wall.holes?.[0]
  if (wall.id === 'cabinet-east' && doorway && positions.length === 2) {
    // Match the corner clearance, measured from the outside of the door frame.
    const offset = doorway.width / 2 + wallOpeningTrim + wallOrnament.halfWidth + wallOrnament.clearance
    positions[0] = doorway.u - offset
    positions[1] = doorway.u + offset
  }
  return positions.map(u => ({
    wallId: wall.id,
    position: wallPosition(wall, u, wallOrnament.height, wallFace + 0.002),
    rotation: wall.rotation,
  }))
})
