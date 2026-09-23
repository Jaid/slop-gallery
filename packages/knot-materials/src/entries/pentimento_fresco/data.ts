import type {KnotData} from '../../types.ts'

export default {
  id: 'pentimento_fresco',
  candidateId: 'gpt_sol',
  title: 'Pentimento Fresco',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'An earlier image returns through the painted surface, unwilling to be forgotten.',
  placeholder: {
    color: '#5077e8',
    shading: 'smooth',
  },
} as const satisfies KnotData
