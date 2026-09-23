import type {KnotData} from '../../types.ts'

export default {
  id: 'enamel_semaphore',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  title: 'Enamel Semaphore',
  flavorText: 'A message for ships that never sailed, fired into enamel and folded beyond the horizon.',
  placeholder: {
    color: '#e85032',
    shading: 'smooth',
  },
} as const satisfies KnotData
