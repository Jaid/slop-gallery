import type {KnotData} from '../../types.ts'

export default {
  id: 'kintsugi_nocturne',
  candidateId: 'gpt_terra',
  title: 'Kintsugi Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Midnight porcelain has broken, been cherished and returned whole; every quiet fracture keeps a seam of captured sunlight.',
  displacement: 0.009,
  placeholder: {
    color: '#1a1110',
    shading: 'smooth',
  },
} as const satisfies KnotData
