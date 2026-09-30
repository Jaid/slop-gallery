import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'rose_engine',
  candidateId: 'gpt_sol',
  title: 'Rose Engine',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A rose cut by a machine that learned to dream. Brass petals turn over wine-dark enamel, their fine engraved vows visible only to a patient eye.',
  placeholder: {
    color: '#6d1026',
    shading: 'metal',
  },
} as const satisfies KnotData
