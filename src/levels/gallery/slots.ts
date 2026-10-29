import type {PortraitRatio, PortraitSlot} from '#src/lib/gallery/types.ts'

import {banquetWallPanels} from '#src/lib/gallery/banquet.ts'
import {lodgeWindow} from '#src/lib/gallery/lodge.ts'
import {oculusPlatform, oculusRampLandings} from '#src/lib/gallery/lowerGallery.ts'
import portraitLabel from '#src/lib/gallery/portraitLabel.ts'
import {siennaWainscot} from '#src/lib/gallery/sienna.ts'
import {galleryPlacement} from '#src/lib/gallery/walls.ts'
import {slotFrame} from '#src/lib/placement/portraitSlots.ts'
import {wallPosition} from '#src/lib/placement/wallGeometry.ts'

/** a slot as wall, ratio, frame area in cm², priority for default works, position along the wall, height of the frame’s center and whether its placard goes above it */
type SlotSpec = readonly [wallId: string, ratio: PortraitRatio, area: number, priority: number, u: number, y: number, labelAbove?: boolean]

const wall = (id: string) => galleryPlacement.wall(id)!
const middle = ([start, end]: readonly [number, number]) => (start + end) / 2
/** how far a frame’s center sits above the middle of the frame and its placard below, together */
const placardLift = (portraitLabel.offset + portraitLabel.height / 2) / 2
/** the middle of a Banquet boiserie panel along the wall */
const banquetPanel = (id: string, index: number) => middle(banquetWallPanels(wall(id)).upper[index].u)
/** Banquet frames and placards sit centered in the height of the boiserie panels. */
const banquetY = middle(banquetWallPanels(wall('banquet-east')).upper[0].v) + placardLift
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
  ['lobby-north', '2:3', 30_000, 0, -3.6, 2.7],
  ['lobby-north', '2:3', 30_000, 0, 3.6, 2.7],
  ['lobby-east', '2:3', 30_000, 100, -2.8, 2.7],
  ['lobby-west', '2:3', 30_000, 100, 2.8, 2.7],
  ['lobby-south', '1:1', 60_000, 0, -4.6, 2.7],
  ['lobby-south', '1:1', 60_000, 0, 4.6, 2.7],
  ['lobby-extension-east', '3:2', 30_000, 100, 8, 2.7],
  ['lobby-extension-west', '3:2', 30_000, 100, -8, 2.7],
  // Antechamber and Vesper: one large work centered on each wall
  ['antechamber-south', '1:1', 100_000, 0, 0, 3],
  ['antechamber-west', '1:1', 100_000, 0, 0, 3],
  ['vesper-north', '1:1', 100_000, 0, 0, 3.2],
  ['vesper-west', '1:1', 100_000, 0, 0, 3.2],
  // Banquet: one work per boiserie panel
  ['banquet-north', '2:3', 30_000, 0, banquetPanel('banquet-north', 0), banquetY],
  ['banquet-north', '2:3', 30_000, 0, banquetPanel('banquet-north', 1), banquetY],
  ['banquet-east', '3:2', 30_000, 0, banquetPanel('banquet-east', 0), banquetY],
  ['banquet-east', '3:2', 30_000, 0, banquetPanel('banquet-east', 1), banquetY],
  ['banquet-east', '3:2', 30_000, 0, banquetPanel('banquet-east', 2), banquetY],
  ['banquet-south', '3:2', 30_000, 0, banquetPanel('banquet-south', 0), banquetY],
  ['banquet-south', '3:2', 30_000, 0, banquetPanel('banquet-south', 1), banquetY],
  ['banquet-south', '3:2', 30_000, 0, banquetPanel('banquet-south', 2), banquetY],
  ['banquet-west', '2:3', 30_000, 0, banquetPanel('banquet-west', 0), banquetY],
  ['banquet-west', '3:2', 30_000, 0, banquetPanel('banquet-west', 1), banquetY],
  ['banquet-west', '3:2', 30_000, 0, banquetPanel('banquet-west', 2), banquetY],
  // Sienna: above wainscot panels
  ['sienna-north', '1:1', 15_000, 0, siennaPanel('sienna-north', 2), 3.15],
  ['sienna-east', '1:1', 15_000, 0, siennaPanel('sienna-east', 1), 3.15],
  ['sienna-east', '1:1', 15_000, 0, siennaPanel('sienna-east', 4), 3.15],
  ['sienna-south', '1:1', 15_000, 0, siennaPanel('sienna-south', 1), 3.15],
  ['sienna-south', '1:1', 15_000, 0, siennaPanel('sienna-south', 4), 3.15],
  ['sienna-west', '1:1', 15_000, 0, siennaPanel('sienna-west', 1), 3.15],
  // Oculus: the piers beside the south and north openings, and the east and west landings
  ['oculus-south', '3:2', 60_000, 0, -oculusLandingU, oculusLandingY, true],
  ['oculus-south', '3:2', 60_000, 0, oculusLandingU, oculusLandingY, true],
  ['oculus-north', '3:2', 30_000, 0, -5.6, -2.7],
  ['oculus-north', '3:2', 30_000, 0, 5.6, -2.7],
  ['oculus-east', '3:2', 30_000, 0, oculusPlatformU, -2.85],
  ['oculus-west', '3:2', 30_000, 0, -oculusPlatformU, -2.85],
  // Lodge: one centered on each wall of the north bay, one each side of the fireplace and one facing the window
  ['lodge-northwest', '3:2', 30_000, 0, 0, lodgeY],
  ['lodge-north', '3:2', 30_000, 0, 0, lodgeY],
  ['lodge-northeast', '3:2', 30_000, 0, 0, lodgeY],
  ['lodge-south', '1:1', 15_000, 0, -3.5, lodgeY],
  ['lodge-south', '1:1', 15_000, 0, 3.5, lodgeY],
  ['lodge-east', '1:1', 15_000, 0, lodgeWindowU, lodgeY],
]
const counts = new Map<string, number>
const slots: Array<PortraitSlot> = specs.map(([wallId, ratio, area, priority, u, y, labelAbove]) => {
  const index = counts.get(wallId) ?? 0
  counts.set(wallId, index + 1)
  return {
    id: `${wallId}-${index}`,
    wallId,
    ratio,
    priority,
    ...slotFrame(ratio, area),
    position: wallPosition(wall(wallId), u, y),
    rotation: wall(wallId).rotation,
    ...labelAbove ? {labelAbove} : {},
  }
})

export default slots
