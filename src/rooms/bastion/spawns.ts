import type {RoomSpawn} from '../base/Room.ts'

import {bastionHairpin, bastionOrigin} from '#src/lib/gallery/bastion.ts'

const start = bastionHairpin.route.at(0.6)
const [originX, originY, originZ] = bastionOrigin

export default {
  // Where the mouth hands over to the hairpin, at the foot of its west leg, looking south up the leg toward the turn.
  '': {
    position: [start.point[0] - originX, start.y - originY + 0.04, start.point[1] - originZ],
    yaw: Math.PI,
    pitch: 0,
  },
} satisfies Record<string, RoomSpawn>
