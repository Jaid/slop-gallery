import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_hopper',
  candidateId: 'deepseek',
  title: 'Bismuth Hopper',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'Color descends a stairway that grows deeper with every reflection.',
  placeholder: {
    color: '#a0c8ff',
    shading: 'metal',
  },
} as const satisfies KnotData
