import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_cathedral',
  candidateId: 'deepseek',
  title: 'Abyssal Cathedral',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'The drowned nave still gathers light for a congregation of currents.',
  placeholder: {
    color: '#3ac6d6',
    shading: 'smooth',
  },
} as const satisfies KnotData
