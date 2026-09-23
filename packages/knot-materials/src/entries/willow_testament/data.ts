import type {KnotData} from '../../types.ts'

export default {
  id: 'willow_testament',
  candidateId: 'gpt_astra',
  title: 'Willow Testament',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Blue gardens climb a porcelain moon. Every golden vein remembers the hand that painted it.',
  placeholder: {
    color: '#dfe6e8',
    shading: 'smooth',
  },
} as const satisfies KnotData
