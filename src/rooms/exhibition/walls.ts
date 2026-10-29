import type {RoomWall} from '../base/Room.ts'

import roomOrigins from '#src/lib/gallery/layout.ts'
import lowerGallery, {tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
import tunnelDisplays, {tunnelDisplayWindow} from '#src/lib/gallery/tunnelDisplays.ts'

import {localWalls} from '../lib/walls.ts'

const {tunnel} = lowerGallery
const [originX] = roomOrigins.exhibition
/** One of the tunnel’s side walls, rising with its floor, with the glazed window onto the display behind it. */
const tunnelWall = (side: -1 | 1): RoomWall => ({
  center: [tunnel.x + side * tunnel.width / 2 - originX, 0, 0],
  rotation: side < 0 ? Math.PI / 2 : -Math.PI / 2,
  width: tunnel.southZ - tunnel.northZ,
  height: tunnel.height,
  slope: side * tunnelSlope,
  sticky: false,
  trimStyle: 'plain',
  holes: {
    display: {
      u: 0,
      bottom: tunnelDisplayWindow.bottom,
      height: tunnelDisplayWindow.top,
      width: tunnelDisplayWindow.width,
      glassThickness: tunnelDisplayWindow.glassThickness,
      profile: 'rectangle',
    },
  },
})

export default {
  west: tunnelWall(-1),
  east: tunnelWall(1),
  // The staff stairways’ walls, from the doors at the balcony’s ends down to the displays.
  ...localWalls('exhibition', roomOrigins.exhibition, tunnelDisplays.flatMap(({stairway}) => stairway.walls), {
    stairs_west_display_entry: ['door'],
    stairs_east_display_entry: ['door'],
  }),
} satisfies Record<string, RoomWall>
