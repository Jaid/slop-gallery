import type {KnotData} from '../../types.ts'

// Mage run: 4cRctoZrXREvmK4; fixture: knot-material-shaders; result: success.
export default {
  id: 'afterimage',
  candidateId: 'gpt_sol',
  title: 'Afterimage',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Three impossible paintings occupy the same skin. Vermilion rivers, violet targets and a cream-colored labyrinth trade places as your shadow passes.',
  placeholder: {
    color: '#fb4b28',
    shading: 'smooth',
  },
} as const satisfies KnotData
