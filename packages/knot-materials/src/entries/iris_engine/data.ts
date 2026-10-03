import type {KnotData} from '../../types.ts'

// Mage run: FLhq233R9MU4dj1; fixture: knot-material-shaders; result: success.
export default {
  id: 'iris_engine',
  candidateId: 'gpt_sol',
  title: 'Iris Engine',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'An optical machine dreams in folded spectra. Its silver apertures open into colors that exist only where you are standing.',
  placeholder: {
    color: '#73899a',
    shading: 'metal',
  },
} as const satisfies KnotData
