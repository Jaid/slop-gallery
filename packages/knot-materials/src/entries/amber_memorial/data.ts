import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'amber_memorial',
  candidateId: 'gpt_sol',
  title: 'Amber Memorial',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Honey remembers what time forgets. Ferns and drifting seeds hang in a golden depth, shifting behind the glass as you circle their small eternity.',
  placeholder: {
    color: '#e9a13b',
    shading: 'glass',
  },
} as const satisfies KnotData
