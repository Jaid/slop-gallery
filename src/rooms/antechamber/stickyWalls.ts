import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -4],
    rotation: 0,
    width: 8,
    height: 6.7,
    holes: [
      {
        u: 0,
        width: 2.6,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
  west: {
    center: [-4, 0, 0],
    rotation: Math.PI / 2,
    width: 8,
    height: 6.7,
  },
  east: {
    center: [4, 0, 0],
    rotation: -Math.PI / 2,
    width: 8,
    height: 6.7,
    holes: [
      {
        u: 0,
        width: 2.6,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
  south: {
    center: [0, 0, 4],
    rotation: Math.PI,
    width: 8,
    height: 6.7,
  },
} satisfies Record<string, RoomStickyWall>
