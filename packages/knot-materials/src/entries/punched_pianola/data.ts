import type {KnotData} from '../../types.ts'

export default {
  id: 'punched_pianola',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  title: 'Punched Pianola',
  createdAt: 1789816097,
  flavorText: 'The missing pieces hold the music; the brass remembers only the spaces between notes.',
  placeholder: {
    color: '#b89252',
    shading: 'metal',
  },
} as const satisfies KnotData
