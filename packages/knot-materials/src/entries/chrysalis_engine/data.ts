import type {KnotData} from '../../types.ts'

export default {
  id: 'chrysalis_engine',
  candidateId: 'gpt_sol',
  title: 'Chrysalis Engine',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Something mechanical is dreaming of the wings it will grow.',
  placeholder: {
    color: '#53efd0',
    shading: 'smooth',
  },
} as const satisfies KnotData
