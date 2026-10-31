import type {Lamp} from '../base/Room.ts'

const lantern = {
  tint: '#ffb363',
} as const

// Four lanterns: in the doorway passage from the Lodge’s bay, at the north end of the long hall, in its middle and at its south end; the middle one reaches farthest.
export default {
  lantern_lodge: {
    ...lantern,
    position: [8.7, 2.5, -28.7837],
    strength: 14,
    range: 8,
  },
  lantern_north: {
    ...lantern,
    position: [0, 2.5, -22.4568],
    strength: 14,
    range: 8,
  },
  lantern_middle: {
    ...lantern,
    position: [0, 2.4, -0.58],
    strength: 5.6,
    range: 20,
    decay: 1,
  },
  lantern_south: {
    ...lantern,
    position: [2.08, 2.4, 25.9663],
    strength: 22.4,
    range: 6,
  },
} satisfies Record<string, Lamp>
