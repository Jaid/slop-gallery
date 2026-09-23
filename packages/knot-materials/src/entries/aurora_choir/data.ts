import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_choir',
  candidateId: 'gpt_sol',
  title: 'Aurora Choir',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Every ribbon sings a different color into the polar silence.',
  placeholder: {
    color: '#61ffd3',
    shading: 'smooth',
  },
} as const satisfies KnotData
