import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_chiaroscuro',
  candidateId: 'gpt_sol',
  title: 'Velvet Chiaroscuro',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Light rests on the high folds while the deep fabric keeps its shadows.',
  placeholder: {
    color: '#9c66ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
