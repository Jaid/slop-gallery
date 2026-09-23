import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_terraces',
  candidateId: 'gpt_luna',
  title: 'Bismuth Terraces',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'Rainbow stairways grow through a midnight crystal, each impossible terrace changing its color when you move.',
  displacement: 0.005,
  placeholder: {
    color: '#7e6bb6',
    shading: 'metal',
  },
} as const satisfies KnotData
