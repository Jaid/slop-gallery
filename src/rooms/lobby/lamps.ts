import type {Lamp} from '../base/Room.ts'

const chandelier = (z: number) => ({
  position: [0, 6.6, z],
  strength: 7.2,
  tint: '#ffd27a',
  range: 15,
}) satisfies Lamp

// One under each of the vault’s three chandeliers, hung below the hub to reach past the candle ring.
export default {
  chandelier_north: chandelier(-8),
  chandelier_middle: chandelier(0),
  chandelier_south: chandelier(8),
} satisfies Record<string, Lamp>
