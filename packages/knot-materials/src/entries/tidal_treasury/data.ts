import type {KnotData} from '../../types.ts'

export default {
  id: 'tidal_treasury',
  candidateId: 'gpt_astra',
  title: 'Tidal Treasury',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'The ocean hides its finest colors between layers of pearl, opening each small door only to a moving eye.',
  placeholder: {
    color: '#4f8c93',
    shading: 'glass',
  },
} as const satisfies KnotData
