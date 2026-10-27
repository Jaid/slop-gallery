import type {Lamp} from '../base/Room.ts'

export default {
  // Below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source.
  chandelier: {
    position: [0, 3.05, 0],
    strength: 110,
    tint: '#ffd36c',
    range: 15,
    decay: 1.75,
    shadow: true,
  },
} satisfies Record<string, Lamp>
