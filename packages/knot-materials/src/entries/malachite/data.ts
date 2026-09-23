import type {KnotData} from '../../types.ts'

export default {
  id: 'malachite',
  candidateId: 'gpt_astra',
  title: 'Emerald Heart',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'Green bands circle an ancient secret, one mineral season at a time.',
  placeholder: {
    color: '#51d4a0',
    shading: 'stone',
  },
} as const satisfies KnotData
