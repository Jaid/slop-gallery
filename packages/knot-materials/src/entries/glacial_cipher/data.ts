import type {KnotData} from '../../types.ts'

export default {
  id: 'glacial_cipher',
  candidateId: 'gpt_sol',
  title: 'Glacial Cipher',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'The glacier has written its secrets in fractures too cold to speak.',
  placeholder: {
    color: '#a4efff',
    shading: 'glass',
  },
} as const satisfies KnotData
