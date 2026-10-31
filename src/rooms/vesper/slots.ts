import type {RoomPortraitSlot} from '../base/Room.ts'

export default {
  // Toward the east end of the north wall.
  north_0: {
    wallId: 'north',
    ratio: '1:1',
    area: 100_000,
    position: [3.75, 3.2, -11.78],
    rotation: 0,
  },
  west_0: {
    wallId: 'west',
    ratio: '1:1',
    area: 100_000,
    position: [-5.78, 3.2, 0],
    rotation: Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
