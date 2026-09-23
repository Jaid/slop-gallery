import type {KnotData} from '../../types.ts'

export default {
  id: 'glacier_script',
  candidateId: 'gpt_astra',
  title: 'Glacier Script',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Winter writes in planes of trapped air and blue light. The oldest sentences appear only when you move between them.',
  placeholder: {
    color: '#70b0c9',
    shading: 'glass',
  },
} as const satisfies KnotData
