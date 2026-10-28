import type {RoomStickyWall} from '../base/Room.ts'

/** how far the bay reaches north of the square room’s north wall line */
const bayDepth = 2.74

export default {
  northwest: {
    center: [-5 + bayDepth / 2, 0, -5 - bayDepth / 2],
    rotation: Math.PI / 4,
    width: bayDepth * Math.SQRT2,
    height: 3.6,
  },
  north: {
    center: [0, 0, -5 - bayDepth],
    rotation: 0,
    width: 10 - bayDepth * 2,
    height: 3.6,
  },
  northeast: {
    center: [5 - bayDepth / 2, 0, -5 - bayDepth / 2],
    rotation: -Math.PI / 4,
    width: bayDepth * Math.SQRT2,
    height: 3.6,
  },
  west: {
    center: [-5, 0, 0],
    rotation: Math.PI / 2,
    width: 10,
    height: 3.6,
    holes: [
      {
        u: 2.6,
        width: 4,
        height: 3.4,
        profile: 'arch',
      },
      {
        u: -1.5,
        width: 2.4,
        bottom: 1.35,
        height: 2.65,
        profile: 'rectangle',
      },
    ],
  },
  east: {
    center: [5, 0, 0],
    rotation: -Math.PI / 2,
    width: 10,
    height: 3.6,
    holes: [
      {
        u: -2.53,
        width: 4.4,
        height: 3.4,
        profile: 'arch',
      },
    ],
  },
  south: {
    center: [0, 0, 5],
    rotation: Math.PI,
    width: 10,
    height: 3.6,
  },
} satisfies Record<string, RoomStickyWall>
