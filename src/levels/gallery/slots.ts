import type {PortraitRatio, PortraitSlot} from '#src/lib/gallery/types.ts'

import {dineWallPanels} from '#src/lib/gallery/dine.ts'
import {lodgeWindow} from '#src/lib/gallery/lodge.ts'
import {oculusPlatform, oculusRampLandings} from '#src/lib/gallery/lowerGallery.ts'
import portraitLabel from '#src/lib/gallery/portraitLabel.ts'
import {siennaWainscot} from '#src/lib/gallery/sienna.ts'
import {galleryPlacement} from '#src/lib/gallery/walls.ts'
import {slotFrame} from '#src/lib/placement/portraitSlots.ts'
import {wallPosition} from '#src/lib/placement/wallGeometry.ts'

/** a slot as wall, ratio, frame area in cm², position along the wall, height of the frame’s center and whether its placard goes above it */
type SlotSpec = readonly [wallId: string, ratio: PortraitRatio, area: number, u: number, y: number, labelAbove?: boolean]

const wall = (id: string) => galleryPlacement.wall(id)!
const middle = ([start, end]: readonly [number, number]) => (start + end) / 2
/** how far a frame’s center sits above the middle of the frame and its placard below, together */
const placardLift = (portraitLabel.offset + portraitLabel.height / 2) / 2
/** the middle of a Dine boiserie panel along the wall */
const dinePanel = (id: string, index: number) => middle(dineWallPanels(wall(id)).upper[index].u)
/** Dine frames and placards sit centered in the height of the boiserie panels. */
const dineY = middle(dineWallPanels(wall('dine-east')).upper[0].v) + placardLift
/** the middle of a Sienna wainscot panel, so frames line up with the panels below them */
const siennaPanel = (id: string, index: number) => siennaWainscot(wall(id))[index]
// The Lodge hangs at the height of its window’s middle, and the east wall faces the window.
const lodgeY = -3
/** The wide Oculus frames beside the south doorway face the switchback landings, a little toward the doorway, low over the landing’s floor with their placards on top. */
const oculusLandingU = 6.6
const oculusLandingY = oculusRampLandings[0].position[1] + oculusRampLandings[0].size[1] / 2 + 1.85
/** The side frames hang over the middle of the raised north platform. */
const oculusPlatformU = oculusPlatform.position[2] - wall('oculus-east').center[2]
const lodgeWindowU = lodgeWindow.z - wall('lodge-east').center[2]
const specs: ReadonlyArray<SlotSpec> = [
  // Lobby: the arched alcoves, the piers beside the south door and the near end of the extension
  ['lobby-north', '2:3', 38_400, -3.6, 2.7],
  ['lobby-north', '2:3', 38_400, 3.6, 2.7],
  ['lobby-east', '2:3', 38_400, -2.8, 2.7],
  ['lobby-west', '2:3', 38_400, 2.8, 2.7],
  ['lobby-south', '1:1', 57_600, -4.6, 2.7],
  ['lobby-south', '1:1', 57_600, 4.6, 2.7],
  ['lobby-extension-east', '3:2', 38_400, 8, 2.7],
  ['lobby-extension-west', '3:2', 38_400, -8, 2.7],
  // Antechamber and Vesper: one large work centered on each wall
  ['antechamber-south', '1:1', 90_000, 0, 3],
  ['antechamber-west', '1:1', 90_000, 0, 3],
  ['vesper-north', '1:1', 90_000, 0, 3.2],
  ['vesper-west', '1:1', 90_000, 0, 3.2],
  // Dine: one work per boiserie panel
  ['dine-north', '2:3', 38_400, dinePanel('dine-north', 0), dineY],
  ['dine-north', '2:3', 38_400, dinePanel('dine-north', 1), dineY],
  ['dine-east', '3:2', 38_400, dinePanel('dine-east', 0), dineY],
  ['dine-east', '3:2', 38_400, dinePanel('dine-east', 1), dineY],
  ['dine-east', '3:2', 38_400, dinePanel('dine-east', 2), dineY],
  ['dine-south', '3:2', 38_400, dinePanel('dine-south', 0), dineY],
  ['dine-south', '3:2', 38_400, dinePanel('dine-south', 1), dineY],
  ['dine-south', '3:2', 38_400, dinePanel('dine-south', 2), dineY],
  ['dine-west', '2:3', 21_600, dinePanel('dine-west', 0), dineY],
  ['dine-west', '3:2', 38_400, dinePanel('dine-west', 1), dineY],
  ['dine-west', '3:2', 38_400, dinePanel('dine-west', 2), dineY],
  // Sienna: above wainscot panels
  ['sienna-north', '1:1', 16_900, siennaPanel('sienna-north', 2), 3.15],
  ['sienna-east', '1:1', 16_900, siennaPanel('sienna-east', 1), 3.15],
  ['sienna-east', '1:1', 16_900, siennaPanel('sienna-east', 4), 3.15],
  ['sienna-south', '1:1', 16_900, siennaPanel('sienna-south', 1), 3.15],
  ['sienna-south', '1:1', 16_900, siennaPanel('sienna-south', 4), 3.15],
  ['sienna-west', '1:1', 16_900, siennaPanel('sienna-west', 1), 3.15],
  // Oculus: the piers beside the south and north openings, and the east and west landings
  ['oculus-south', '3:2', 60_000, -oculusLandingU, oculusLandingY, true],
  ['oculus-south', '3:2', 60_000, oculusLandingU, oculusLandingY, true],
  ['oculus-north', '3:2', 38_400, -5.6, -2.7],
  ['oculus-north', '3:2', 38_400, 5.6, -2.7],
  ['oculus-east', '3:2', 21_600, oculusPlatformU, -2.85],
  ['oculus-west', '3:2', 21_600, -oculusPlatformU, -2.85],
  // Lodge: three evenly along the north wall, one each side of the fireplace and one facing the window
  ['lodge-north', '3:2', 21_600, -3, lodgeY],
  ['lodge-north', '3:2', 21_600, 0, lodgeY],
  ['lodge-north', '3:2', 21_600, 3, lodgeY],
  ['lodge-south', '1:1', 16_900, -3.5, lodgeY],
  ['lodge-south', '1:1', 16_900, 3.5, lodgeY],
  ['lodge-east', '1:1', 16_900, lodgeWindowU, lodgeY],
]
const counts = new Map<string, number>
const slots: Array<PortraitSlot> = specs.map(([wallId, ratio, area, u, y, labelAbove]) => {
  const index = counts.get(wallId) ?? 0
  counts.set(wallId, index + 1)
  return {
    id: `${wallId}-${index}`,
    wallId,
    ratio,
    ...slotFrame(ratio, area),
    position: wallPosition(wall(wallId), u, y),
    rotation: wall(wallId).rotation,
    ...labelAbove ? {labelAbove} : {},
  }
})

export default slots
