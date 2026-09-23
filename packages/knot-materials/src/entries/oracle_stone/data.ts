import type {KnotData} from '../../types.ts'

export default {
  id: 'oracle_stone',
  candidateId: 'gpt_terra',
  title: 'Oracle Stone',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Within charcoal stone, hidden crystal plates answer the eye with blue fire, cyan weather and impossible depth.',
  placeholder: {
    color: '#0b3340',
    shading: 'stone',
  },
} as const satisfies KnotData
