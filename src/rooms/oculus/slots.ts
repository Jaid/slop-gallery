import type {RoomPortraitSlot} from '../base/Room.ts'

export default {
  south_0: {
    wallId: 'south',
    ratio: '3:2',
    area: 60_000,
    position: [6.6, 3.85, 9.78],
    rotation: Math.PI,
    labelAbove: true,
  },
  south_1: {
    wallId: 'south',
    ratio: '3:2',
    area: 60_000,
    position: [-6.6, 3.85, 9.78],
    rotation: Math.PI,
    labelAbove: true,
  },
  east_0: {
    wallId: 'east',
    ratio: '3:2',
    area: 30_000,
    position: [8.78, 7.15, -8],
    rotation: -Math.PI / 2,
  },
  west_0: {
    wallId: 'west',
    ratio: '3:2',
    area: 30_000,
    position: [-8.78, 7.15, -8],
    rotation: Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
