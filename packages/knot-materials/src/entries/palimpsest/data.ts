import type {KnotData} from '../../types.ts'

// Mage run: 4cRctoZrXREvmK4; fixture: knot-material-shaders; result: success.
export default {
  id: 'palimpsest',
  candidateId: 'gpt_sol',
  title: 'Palimpsest',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  displacement: 0.0025,
  flavorText: 'The erased language lies just beneath the visible one. A passing eye turns old ink to gold, and the page remembers what its author forgot.',
  placeholder: {
    color: '#f5dfae',
    shading: 'fabric',
  },
} as const satisfies KnotData
