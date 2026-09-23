import type {KnotData} from '../../types.ts'

export default {
  id: 'cryo_bloom',
  candidateId: 'deepseek',
  title: 'Cryo Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'Frost opens its delicate petals before the warmth can find them.',
  placeholder: {
    color: '#8cf5ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
