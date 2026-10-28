import type {Lamp} from '../base/Room.ts'

export default {
  // High above the front log, flickering around an average of 90%.
  fire: {
    position: [0, 1.1, 3.9],
    strength: 68,
    tint: '#ffb45b',
    range: 10,
    shadow: true,
  },
  // In the candle plane of the wagon wheel, below its rim, so the iron never shadows its own light. It hangs from the boss in front of the north bay.
  chandelier: {
    position: [0, 2.66, -2.74],
    strength: 20,
    tint: '#ffc68a',
    range: 7,
    decay: 1.25,
    shadow: true,
  },
} satisfies Record<string, Lamp>
