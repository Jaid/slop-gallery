import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_garden',
  candidateId: 'gpt_terra',
  title: 'Bismuth Garden',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Impossible crystal terraces have climbed the knot overnight, growing a different rainbow on every edge.',
  placeholder: {
    color: '#9883ad',
    shading: 'metal',
  },
} as const satisfies KnotData
