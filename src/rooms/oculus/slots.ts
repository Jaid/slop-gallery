import type {RoomPortraitSlot} from '../base/Room.ts'

export default {
  south_0: {
    wallId: 'south',
    ratio: '3:2',
    area: 60_000,
    position: [6.6, 4.85, 9.78],
    rotation: Math.PI,
    labelAbove: true,
  },
  south_1: {
    wallId: 'south',
    ratio: '3:2',
    area: 60_000,
    position: [-6.6, 4.85, 9.78],
    rotation: Math.PI,
    labelAbove: true,
  },
  north_0: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [-5.6, 8.3, -9.78],
    rotation: 0,
  },
  north_1: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [5.6, 8.3, -9.78],
    rotation: 0,
  },
  east_0: {
    wallId: 'east',
    ratio: '3:2',
    area: 30_000,
    position: [8.78, 8.15, -8],
    rotation: -Math.PI / 2,
  },
  west_0: {
    wallId: 'west',
    ratio: '3:2',
    area: 30_000,
    position: [-8.78, 8.15, -8],
    rotation: Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
