import type {KnotData} from '../../types.ts'

export default {
  id: 'signal_bloom',
  candidateId: 'gpt_astra',
  title: 'Signal Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'An impossible flower broadcasts from the future. Move, and its petals remember a different arrangement.',
  placeholder: {
    color: '#e56f61',
    shading: 'smooth',
  },
} as const satisfies KnotData
