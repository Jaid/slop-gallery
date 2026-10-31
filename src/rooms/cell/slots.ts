import type {RoomPortraitSlot} from '../base/Room.ts'

// On each side wall, a large square work between two landscape ones, all centered on one line, numbered from left to right as seen from the room.
export default {
  east_0: {
    wallId: 'east',
    ratio: '3:2',
    area: 30_000,
    position: [6.655, 2.3, -3.4],
    rotation: -Math.PI / 2,
  },
  east_1: {
    wallId: 'east',
    ratio: '1:1',
    area: 60_000,
    position: [6.655, 2.3, 0],
    rotation: -Math.PI / 2,
  },
  east_2: {
    wallId: 'east',
    ratio: '3:2',
    area: 30_000,
    position: [6.655, 2.3, 3.4],
    rotation: -Math.PI / 2,
  },
  west_0: {
    wallId: 'west',
    ratio: '3:2',
    area: 30_000,
    position: [-6.655, 2.3, 3.4],
    rotation: Math.PI / 2,
  },
  west_1: {
    wallId: 'west',
    ratio: '1:1',
    area: 60_000,
    position: [-6.655, 2.3, 0],
    rotation: Math.PI / 2,
  },
  west_2: {
    wallId: 'west',
    ratio: '3:2',
    area: 30_000,
    position: [-6.655, 2.3, -3.4],
    rotation: Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
