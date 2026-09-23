import type {KnotData} from '../../types.ts'

export default {
  id: 'nacre_nocturne',
  candidateId: 'gpt_astra',
  title: 'Nacre Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The moon left its sheet music inside a shell. Each hand-cut fragment remembers a different color of the tide.',
  placeholder: {
    color: '#8a7ea8',
    shading: 'glass',
  },
} as const satisfies KnotData
