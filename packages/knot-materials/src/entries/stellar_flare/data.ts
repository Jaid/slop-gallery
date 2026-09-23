import type {KnotData} from '../../types.ts'

export default {
  id: 'stellar_flare',
  candidateId: 'gemini_flash',
  title: 'Stellar Flare',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Boiling convective granules and twisting magnetic loops bind thermonuclear fire to the winding path of the knot.',
  placeholder: {
    color: '#ed6b19',
    shading: 'smooth',
  },
} as const satisfies KnotData
