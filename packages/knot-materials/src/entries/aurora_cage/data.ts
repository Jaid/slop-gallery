import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_cage',
  candidateId: 'deepseek',
  title: 'Aurora Cage',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'Northern light presses softly against the bars of its gilded prison.',
  placeholder: {
    color: '#00ff88',
    shading: 'smooth',
  },
} as const satisfies KnotData
