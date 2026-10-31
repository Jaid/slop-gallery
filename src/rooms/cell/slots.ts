import type {RoomPortraitSlot} from '../base/Room.ts'

// A large landscape work in the middle of every wall between two portrait ones, each wall’s slots numbered from left to right as seen from the room.
export default {
  north_0: {
    wallId: 'north',
    ratio: '2:3',
    area: 15_000,
    position: [-2.6, 1.9, -3.905],
    rotation: 0,
  },
  north_1: {
    wallId: 'north',
    ratio: '3:2',
    area: 30_000,
    position: [0, 1.9, -3.905],
    rotation: 0,
  },
  north_2: {
    wallId: 'north',
    ratio: '2:3',
    area: 15_000,
    position: [2.6, 1.9, -3.905],
    rotation: 0,
  },
  east_0: {
    wallId: 'east',
    ratio: '2:3',
    area: 15_000,
    position: [3.905, 1.9, -2.6],
    rotation: -Math.PI / 2,
  },
  east_1: {
    wallId: 'east',
    ratio: '3:2',
    area: 30_000,
    position: [3.905, 1.9, 0],
    rotation: -Math.PI / 2,
  },
  east_2: {
    wallId: 'east',
    ratio: '2:3',
    area: 15_000,
    position: [3.905, 1.9, 2.6],
    rotation: -Math.PI / 2,
  },
  south_0: {
    wallId: 'south',
    ratio: '2:3',
    area: 15_000,
    position: [2.6, 1.9, 3.905],
    rotation: Math.PI,
  },
  south_1: {
    wallId: 'south',
    ratio: '3:2',
    area: 30_000,
    position: [0, 1.9, 3.905],
    rotation: Math.PI,
  },
  south_2: {
    wallId: 'south',
    ratio: '2:3',
    area: 15_000,
    position: [-2.6, 1.9, 3.905],
    rotation: Math.PI,
  },
  west_0: {
    wallId: 'west',
    ratio: '2:3',
    area: 15_000,
    position: [-3.905, 1.9, 2.6],
    rotation: Math.PI / 2,
  },
  west_1: {
    wallId: 'west',
    ratio: '3:2',
    area: 30_000,
    position: [-3.905, 1.9, 0],
    rotation: Math.PI / 2,
  },
  west_2: {
    wallId: 'west',
    ratio: '2:3',
    area: 15_000,
    position: [-3.905, 1.9, -2.6],
    rotation: Math.PI / 2,
  },
} satisfies Record<string, RoomPortraitSlot>
