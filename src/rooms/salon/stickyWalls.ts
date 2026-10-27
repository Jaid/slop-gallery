import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -8],
    rotation: 0,
    width: 12,
    height: 5.5,
  },
  east: {
    center: [6, 0, 0],
    rotation: -Math.PI / 2,
    width: 16,
    height: 5.5,
  },
  south: {
    center: [0, 0, 8],
    rotation: Math.PI,
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
  west: {
    center: [-6, 0, 0],
    rotation: Math.PI / 2,
    width: 16,
    height: 5.5,
    holes: [
      {
        u: 0,
        width: 8,
        bottom: 1.2,
        height: 4.2,
        profile: 'rectangle',
      },
    ],
  },
} satisfies Record<string, RoomStickyWall>
