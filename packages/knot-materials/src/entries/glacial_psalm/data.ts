import type {KnotData} from '../../types.ts'

// Mage run: 4cRctoZrXREvmK4; fixture: knot-material-shaders; result: success.
export default {
  id: 'glacial_psalm',
  candidateId: 'gpt_sol',
  title: 'Glacial Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Winter writes six-armed hymns inside the ice. Silver breath gathers at their edges, then thins to reveal another forest far below.',
  placeholder: {
    color: '#6393a9',
    shading: 'glass',
  },
} as const satisfies KnotData
