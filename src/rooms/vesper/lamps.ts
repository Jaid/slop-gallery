import type {Lamp} from '../base/Room.ts'

// The two light boxes in the ceiling.
export default {
  ceiling_north: {
    position: [0, 4.5, -3.5],
    strength: 40,
    tint: '#fff1d8',
    range: 14,
  },
  ceiling_south: {
    position: [0, 4.5, 3.5],
    strength: 40,
    tint: '#fff1d8',
    range: 14,
  },
} satisfies Record<string, Lamp>
