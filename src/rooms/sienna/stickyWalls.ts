import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -6],
    rotation: 0,
    width: 12,
    height: 5.5,
    holes: [
      {
        u: 3.8,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    ],
  },
  west: {
    center: [-6, 0, 0],
    rotation: Math.PI / 2,
    width: 12,
    height: 5.5,
    holes: [
      {
        u: 3.6,
        width: 4,
        height: 3.4,
        profile: 'arch',
      },
    ],
  },
  east: {
    center: [6, 0, 0],
    rotation: -Math.PI / 2,
    width: 12,
    height: 5.5,
  },
  south: {
    center: [0, 0, 6],
    rotation: Math.PI,
    width: 12,
    height: 5.5,
  },
} satisfies Record<string, RoomStickyWall>
