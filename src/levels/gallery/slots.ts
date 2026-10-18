import type {PortraitRatio, PortraitSlot} from '#src/lib/gallery/types.ts'

import {dineWallPanels} from '#src/lib/gallery/dine.ts'
import {lodgeWindow} from '#src/lib/gallery/lodge.ts'
import portraitLabel from '#src/lib/gallery/portraitLabel.ts'
import {siennaWainscot} from '#src/lib/gallery/sienna.ts'
import {galleryPlacement} from '#src/lib/gallery/walls.ts'
import {slotFrame} from '#src/lib/placement/portraitSlots.ts'
import {wallPosition} from '#src/lib/placement/wallGeometry.ts'

/** a slot as wall, ratio, longer edge, position along the wall and height of the frame’s center */
type SlotSpec = readonly [wallId: string, ratio: PortraitRatio, size: number, u: number, y: number]

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
const lodgeWindowU = lodgeWindow.z - wall('lodge-east').center[2]
const specs: ReadonlyArray<SlotSpec> = [
  // Lobby: the arched alcoves, the piers beside the south door and the near end of the extension
  ['lobby-north', '2:3', 2.4, -3.6, 2.7],
  ['lobby-north', '2:3', 2.4, 3.6, 2.7],
  ['lobby-east', '2:3', 2.4, -2.8, 2.7],
  ['lobby-west', '2:3', 2.4, 2.8, 2.7],
  ['lobby-south', '1:1', 2.4, -4.6, 2.7],
  ['lobby-south', '1:1', 2.4, 4.6, 2.7],
  ['lobby-extension-east', '3:2', 2.4, 8, 2.7],
  ['lobby-extension-west', '3:2', 2.4, -8, 2.7],
  // Antechamber and Vesper: one large work centered on each wall
  ['antechamber-south', '1:1', 3, 0, 3],
  ['antechamber-west', '1:1', 3, 0, 3],
  ['vesper-north', '1:1', 3, 0, 3.2],
  ['vesper-west', '1:1', 3, 0, 3.2],
  // Dine: one work per boiserie panel
  ['dine-north', '2:3', 2.4, dinePanel('dine-north', 0), dineY],
  ['dine-north', '2:3', 2.4, dinePanel('dine-north', 1), dineY],
  ['dine-east', '3:2', 2.4, dinePanel('dine-east', 0), dineY],
  ['dine-east', '3:2', 2.4, dinePanel('dine-east', 1), dineY],
  ['dine-east', '3:2', 2.4, dinePanel('dine-east', 2), dineY],
  ['dine-south', '3:2', 2.4, dinePanel('dine-south', 0), dineY],
  ['dine-south', '3:2', 2.4, dinePanel('dine-south', 1), dineY],
  ['dine-south', '3:2', 2.4, dinePanel('dine-south', 2), dineY],
  ['dine-west', '2:3', 1.8, dinePanel('dine-west', 0), dineY],
  ['dine-west', '3:2', 2.4, dinePanel('dine-west', 1), dineY],
  ['dine-west', '3:2', 2.4, dinePanel('dine-west', 2), dineY],
  // Sienna: above wainscot panels
  ['sienna-north', '1:1', 1.3, siennaPanel('sienna-north', 2), 3.15],
  ['sienna-east', '1:1', 1.3, siennaPanel('sienna-east', 1), 3.15],
  ['sienna-east', '1:1', 1.3, siennaPanel('sienna-east', 4), 3.15],
  ['sienna-south', '1:1', 1.3, siennaPanel('sienna-south', 1), 3.15],
  ['sienna-south', '1:1', 1.3, siennaPanel('sienna-south', 4), 3.15],
  ['sienna-west', '1:1', 1.3, siennaPanel('sienna-west', 1), 3.15],
  // Oculus: the piers beside the south and north openings, and the east and west landings
  ['oculus-south', '1:1', 2.4, -5.6, -4.85],
  ['oculus-south', '1:1', 2.4, 5.6, -4.85],
  ['oculus-north', '3:2', 2.4, -5.6, -2.7],
  ['oculus-north', '3:2', 2.4, 5.6, -2.7],
  ['oculus-east', '3:2', 1.8, -6, -2.7],
  ['oculus-west', '3:2', 1.8, 6, -2.7],
  // Lodge: three evenly along the north wall, one each side of the fireplace and one facing the window
  ['lodge-north', '3:2', 1.8, -3, lodgeY],
  ['lodge-north', '3:2', 1.8, 0, lodgeY],
  ['lodge-north', '3:2', 1.8, 3, lodgeY],
  ['lodge-south', '1:1', 1.3, -3.5, lodgeY],
  ['lodge-south', '1:1', 1.3, 3.5, lodgeY],
  ['lodge-east', '1:1', 1.3, lodgeWindowU, lodgeY],
]
const counts = new Map<string, number>
const slots: Array<PortraitSlot> = specs.map(([wallId, ratio, size, u, y]) => {
  const index = counts.get(wallId) ?? 0
  counts.set(wallId, index + 1)
  return {
    id: `${wallId}-${index}`,
    wallId,
    ratio,
    ...slotFrame(ratio, size),
    position: wallPosition(wall(wallId), u, y),
    rotation: wall(wallId).rotation,
  }
})

export default slots
