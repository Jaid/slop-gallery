import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -12],
    rotation: 0,
    width: 12,
    height: 5.5,
    holes: [
      {
        u: 0,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    ],
  },
  east: {
    center: [6, 0, 0],
    rotation: -Math.PI / 2,
    width: 24,
    height: 5.5,
  },
  south: {
    center: [0, 0, 12],
    rotation: Math.PI,
    width: 12,
    height: 5.5,
  },
  west: {
    center: [-6, 0, 0],
    rotation: Math.PI / 2,
    width: 24,
    height: 5.5,
    holes: [
      {
        u: -7,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    ],
  },
} satisfies Record<string, RoomStickyWall>
