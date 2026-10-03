import type {KnotData} from '../../types.ts'

// Mage run: FLhq233R9MU4dj1; fixture: knot-material-shaders; result: success.
export default {
  id: 'sovereign_velvet',
  candidateId: 'gpt_sol',
  title: 'Sovereign Velvet',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A coronation robe without a sovereign. Garnet shadows breathe through the pile while old gold remembers the weight of light.',
  placeholder: {
    color: '#6e1137',
    shading: 'fabric',
  },
} as const satisfies KnotData
