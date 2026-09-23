import type {KnotData} from '../../types.ts'

export default {
  id: 'carmine_fold',
  candidateId: 'gpt_astra',
  title: 'Carmine Fold',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A single sheet rehearses the shape of infinity. Along its vermilion creases, a breath passes from mountain to paper valley.',
  displacement: 0.02,
  placeholder: {
    color: '#d2503e',
    shading: 'fabric',
  },
} as const satisfies KnotData
