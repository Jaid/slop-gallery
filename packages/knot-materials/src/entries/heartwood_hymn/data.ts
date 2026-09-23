import type {KnotData} from '../../types.ts'

export default {
  id: 'heartwood_hymn',
  candidateId: 'gpt_astra',
  title: 'Heartwood Hymn',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'The tree is gone; its years are not. Beneath the polish, a slow golden season travels through the grain.',
  placeholder: {
    color: '#5b321f',
    shading: 'smooth',
  },
} as const satisfies KnotData
