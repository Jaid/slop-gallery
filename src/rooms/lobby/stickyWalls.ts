import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -20],
    rotation: 0,
    width: 16,
    height: 5.5,
    reservations: [
      {
        u: 0,
        width: 3.9,
        height: 5.05,
        profile: 'arch',
      },
    ],
  },
  extension_west: {
    center: [-8, 0, -8],
    rotation: Math.PI / 2,
    width: 24,
    height: 5.5,
  },
  extension_east: {
    center: [8, 0, -8],
    rotation: -Math.PI / 2,
    width: 24,
    height: 5.5,
    holes: [
      {
        u: -4,
        width: 8,
        bottom: 1.2,
        height: 4.2,
        profile: 'rectangle',
      },
    ],
  },
  west: {
    center: [-8, 0, 12],
    rotation: Math.PI / 2,
    width: 16,
    height: 5.5,
    holes: [
      {
        u: -3,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    ],
  },
  east: {
    center: [8, 0, 12],
    rotation: -Math.PI / 2,
    width: 16,
    height: 5.5,
    holes: [
      {
        u: 3,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    ],
  },
  south: {
    center: [0, 0, 20],
    rotation: Math.PI,
    width: 16,
    height: 5.5,
    holes: [
      {
        u: 0,
        width: 2.6,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
} satisfies Record<string, RoomStickyWall>
