import type {KnotData} from '../../types.ts'

export default {
  id: 'semaphore_enamel',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  title: 'Semaphore Enamel',
  flavorText: 'Vermilion flags wait in brass frames, spelling a patient message to a train that never arrives.',
  placeholder: {
    color: '#cf4936',
    shading: 'smooth',
  },
} as const satisfies KnotData
