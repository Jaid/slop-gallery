import type {RoomCamera} from '../base/Room.ts'

import {bastionHairpin, bastionOrigin} from '#src/lib/gallery/bastion.ts'

const {route} = bastionHairpin
const top = route.at(route.length - 1.2)
const [originX, originY, originZ] = bastionOrigin

export default {
  // From the top of the east leg, where it hands over to the run north, looking south down the leg into the turn and its lantern.
  overview: {
    position: [top.point[0] - originX, top.y - originY + 1.7, top.point[1] - originZ],
    aim: {
      yaw: Math.PI,
      pitch: -0.12,
    },
    fov: 75,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
