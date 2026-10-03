import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'elderwood',
  candidateId: 'gpt_sol',
  title: 'Elderwood',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Centuries curl beneath a polished wound. Mineral sap still travels the grain, carrying the green memory of a lost orchard.',
  placeholder: {
    color: '#aa6738',
    shading: 'stone',
  },
} as const satisfies KnotData
