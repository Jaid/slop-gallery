import type {Lamp} from '../base/Room.ts'

const lantern = {
  tint: '#ffb363',
} as const

// Five lanterns: in the doorway passage from the Lodge’s bay, at the north end and in the middle of the long hall, in the open elbow at the foot of the flight and in the landing’s elbow at its head; the middle one reaches farthest.
export default {
  lantern_lodge: {
    ...lantern,
    position: [8.7, 2.5, -24.8979],
    strength: 14,
    range: 8,
  },
  lantern_north: {
    ...lantern,
    position: [0, 2.5, -17.6444],
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
    position: [0.2929, 2.4, 22.3734],
    strength: 22.4,
    range: 6,
  },
  lantern_landing: {
    ...lantern,
    position: [7.4787, 7.5, 29.5592],
    strength: 14,
    range: 8,
  },
} satisfies Record<string, Lamp>
