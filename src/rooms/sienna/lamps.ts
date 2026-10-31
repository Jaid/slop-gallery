import type {Lamp} from '../base/Room.ts'

import sienna, {siennaVestibuleLantern} from '#src/lib/gallery/sienna.ts'
import {chandelierLampY} from '#src/lib/physics/chandelier.ts'

const [lanternX, lanternY, lanternZ] = siennaVestibuleLantern.light

export default {
  // Below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source; it swings along with it.
  chandelier: {
    position: [0, chandelierLampY, 0],
    strength: 110,
    tint: '#ffd36c',
    range: 15,
    decay: 1.75,
    shadow: true,
  },
  // Under the lantern in the middle of the vestibule’s ceiling, like the Corridor’s lanterns, which it answers across the arch.
  vestibule: {
    position: [lanternX - sienna.center[0], lanternY - 0.3, lanternZ - sienna.center[1]],
    strength: 14,
    tint: '#ffb363',
    range: 8,
  },
} satisfies Record<string, Lamp>
