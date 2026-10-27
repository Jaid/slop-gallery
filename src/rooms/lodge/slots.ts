import type {RoomPortraitSlot} from '../base/Room.ts'

export default {
  north_0: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [-3, 2, -4.78],
    rotation: 0,
  },
  north_1: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [0, 2, -4.78],
    rotation: 0,
  },
  north_2: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [3, 2, -4.78],
    rotation: 0,
  },
  south_0: {
    wallId: 'south',
    ratio: '1:1',
    area: 15_000,
    position: [3.5, 2, 4.78],
    rotation: Math.PI,
  },
  south_1: {
    wallId: 'south',
    ratio: '1:1',
    area: 15_000,
    position: [-3.5, 2, 4.78],
    rotation: Math.PI,
  },
  east_0: {
    wallId: 'east',
    ratio: '1:1',
    area: 15_000,
    position: [4.78, 2, 1.5],
    rotation: -Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
