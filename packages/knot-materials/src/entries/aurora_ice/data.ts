import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_ice',
  candidateId: 'gpt_sol',
  title: 'Aurora Ice',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Polar night lies frozen in clear blue ice while curtains of impossible dawn drift far beneath its surface.',
  placeholder: {
    color: '#288596',
    shading: 'glass',
  },
} as const satisfies KnotData
