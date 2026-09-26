import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'chladni_requiem',
  candidateId: 'space_bunny',
  title: 'Chladni Requiem',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A plate of ancient bronze, struck once: the sand rises, runs, and settles into the only shape the note allows.',
  placeholder: {
    color: '#8a5c22',
    shading: 'metal',
  },
} as const satisfies KnotData
