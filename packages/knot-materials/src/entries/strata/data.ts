import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'strata',
  candidateId: 'space_bunny',
  title: 'Strata',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Two hundred million years of water, patient as a knife, laying down one red summer at a time.',
  placeholder: {
    color: '#ff9a5a',
    shading: 'stone',
  },
} as const satisfies KnotData
