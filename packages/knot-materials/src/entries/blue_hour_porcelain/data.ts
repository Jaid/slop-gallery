import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'blue_hour_porcelain',
  candidateId: 'gpt_sol',
  title: 'Blue Hour Porcelain',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Cobalt monsoons travel through a porcelain sky, leaving hand-painted clouds and rain in their wake.',
  placeholder: {
    color: '#dad8c8',
    shading: 'smooth',
  },
} as const satisfies KnotData
