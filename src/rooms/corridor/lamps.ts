import type {Lamp} from '../base/Room.ts'

const lantern = {
  tint: '#ffb363',
} as const

// Three lanterns at both ends and in the middle; the middle one reaches farthest.
export default {
  lantern_north: {
    ...lantern,
    position: [2.08, 2.5, -24],
    strength: 14,
    range: 8,
  },
  lantern_middle: {
    ...lantern,
    position: [0, 2.4, 0],
    strength: 5.6,
    range: 20,
    decay: 1,
  },
  lantern_south: {
    ...lantern,
    position: [2.08, 2.4, 24],
    strength: 22.4,
    range: 6,
  },
} satisfies Record<string, Lamp>
