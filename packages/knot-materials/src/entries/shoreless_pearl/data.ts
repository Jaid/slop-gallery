import type {KnotData} from '../../types.ts'

export default {
  id: 'shoreless_pearl',
  candidateId: 'gpt_terra',
  title: 'Shoreless Pearl',
  createdAt: 1791852458,
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A pearl from water without a shore carries moonlit layers beneath its skin, tender colors arriving only when invited.',
  placeholder: {
    color: '#506b72',
    shading: 'glass',
  },
} as const satisfies KnotData
