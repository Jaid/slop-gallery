import type {KnotData} from '../../types.ts'

export default {
  id: 'solar_prominence',
  candidateId: 'deepseek',
  title: 'Solar Prominence',
  createdAt: 1789235998,
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'A loop of incandescent matter hangs above an unseen sun.',
  placeholder: {
    color: '#ff7a1a',
    shading: 'liquid',
  },
} as const satisfies KnotData
