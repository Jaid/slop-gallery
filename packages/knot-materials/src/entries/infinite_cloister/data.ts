import type {KnotData} from '../../types.ts'

// Mage run: 4cRctoZrXREvmK4; fixture: knot-material-shaders; result: success.
export default {
  id: 'infinite_cloister',
  candidateId: 'gpt_sol',
  title: 'Infinite Cloister',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Every ivory doorway opens onto a smaller silence. Walk around the cloister and its rooms unfold, although no room could fit inside the stone.',
  placeholder: {
    color: '#fff1d5',
    shading: 'stone',
  },
} as const satisfies KnotData
