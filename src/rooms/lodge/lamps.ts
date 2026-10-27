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
  // In the candle plane of the wagon wheel, below its rim, so the iron never shadows its own light.
  chandelier: {
    position: [0, 2.91, 1],
    strength: 20,
    tint: '#ffc68a',
    range: 5,
    decay: 1.25,
    shadow: true,
  },
} satisfies Record<string, Lamp>
