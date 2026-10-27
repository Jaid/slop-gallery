import type {RoomStickyWall} from '../base/Room.ts'

export default {
  north: {
    center: [0, 0, -14],
    rotation: 0,
    width: 28,
    height: 5.5,
    holes: [
      {
        u: 8,
        width: 4.2,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
  east: {
    center: [14, 0, 0],
    rotation: -Math.PI / 2,
    width: 28,
    height: 5.5,
    holes: [
      {
        u: 0,
        width: 5.2,
        height: 3.6,
        profile: 'rectangle',
      },
    ],
  },
  south: {
    center: [0, 0, 14],
    rotation: Math.PI,
    width: 28,
    height: 5.5,
  },
  west: {
    center: [-14, 0, 0],
    rotation: Math.PI / 2,
    width: 28,
    height: 5.5,
  },
} satisfies Record<string, RoomStickyWall>
