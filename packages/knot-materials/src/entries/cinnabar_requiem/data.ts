import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'cinnabar_requiem',
  candidateId: 'space_bunny',
  title: 'Cinnabar Requiem',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Thirty coats of lacquer, each one left to cure for a week, until the wood underneath stopped existing.',
  placeholder: {
    color: '#e02a08',
    shading: 'smooth',
  },
} as const satisfies KnotData
