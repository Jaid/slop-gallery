import type {KnotData} from '../../types.ts'

export default {
  id: 'murmuration',
  candidateId: 'gpt_terra',
  title: 'Murmuration',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Thousands of dark barbs turn as one flock, gathering cobalt and green only at the instant the viewer finds their wind.',
  displacement: 0.009,
  placeholder: {
    color: '#163a36',
    shading: 'fabric',
  },
} as const satisfies KnotData
