import type {RoomPortraitSlot} from '../base/Room.ts'

/** how far the bay reaches north of the square room’s north wall line */
const bayDepth = 2.74
/** how far a frame hangs in front of the middle of a 45° bay wall along x and z each */
const diagonalOffset = 0.22 * Math.SQRT1_2

export default {
  northwest_0: {
    wallId: 'northwest',
    ratio: '3:2',
    area: 30_000,
    position: [-5 + bayDepth / 2 + diagonalOffset, 2, -5 - bayDepth / 2 + diagonalOffset],
    rotation: Math.PI / 4,
  },
  northeast_0: {
    wallId: 'northeast',
    ratio: '3:2',
    area: 30_000,
    position: [5 - bayDepth / 2 - diagonalOffset, 2, -5 - bayDepth / 2 + diagonalOffset],
    rotation: -Math.PI / 4,
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
