import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -10],
    rotation: 0,
    width: 18,
    height: 10.28,
    holes: [
      {
        u: 0,
        bottom: 6,
        width: 4.4,
        height: 9.4,
        profile: 'arch',
      },
    ],
  },
  east: {
    center: [9, 0, 0],
    rotation: -Math.PI / 2,
    width: 20,
    height: 10.28,
  },
  west: {
    center: [-9, 0, 0],
    rotation: Math.PI / 2,
    width: 20,
    height: 10.28,
  },
  south: {
    center: [0, 0, 10],
    rotation: Math.PI,
    width: 18,
    height: 10.28,
    holes: [
      {
        u: 0,
        width: 4.2,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
} satisfies Record<string, RoomStickyWall>
