export const siennaRugSize = [4.8, 7.2] as const

/** Dark timber joists under the ceiling, spanning the room’s depth. */
export const siennaCeilingBeam = {
  count: 4,
  width: 0.18,
  height: 0.3,
  centerY: 5.56,
}

/**
 * Joist offsets from the room center along its width, one per equal bay with half a bay to each wall.
 * The count is even so the middle bay stays clear for the chandelier’s canopy and stem.
 */
export function siennaCeilingBeamOffsets(roomWidth: number) {
  const {count} = siennaCeilingBeam
  return Array.from({length: count}, (_, i) => (i + 0.5) * roomWidth / count - roomWidth / 2)
}
