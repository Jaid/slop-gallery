import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'neon_relic',
  candidateId: 'space_bunny',
  title: 'Neon Relic',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Cold cathode, warm glass: the gas remembers the current that made it, and the tube hums a note nobody can hear.',
  placeholder: {
    color: '#ff1f6b',
    shading: 'glass',
  },
} as const satisfies KnotData
