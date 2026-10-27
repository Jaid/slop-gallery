import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -5],
    rotation: 0,
    width: 10,
    height: 3.6,
  },
  west: {
    center: [-5, 0, 0],
    rotation: Math.PI / 2,
    width: 10,
    height: 3.6,
    holes: [
      {
        u: 2.6,
        width: 4,
        height: 3.4,
        profile: 'arch',
      },
      {
        u: -1.5,
        width: 2.4,
        bottom: 1.35,
        height: 2.65,
        profile: 'rectangle',
      },
    ],
  },
  east: {
    center: [5, 0, 0],
    rotation: -Math.PI / 2,
    width: 10,
    height: 3.6,
    holes: [
      {
        u: -2.53,
        width: 4.4,
        height: 3.4,
        profile: 'arch',
      },
    ],
  },
  south: {
    center: [0, 0, 5],
    rotation: Math.PI,
    width: 10,
    height: 3.6,
  },
} satisfies Record<string, RoomStickyWall>
