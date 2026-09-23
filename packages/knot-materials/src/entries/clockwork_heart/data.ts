import type {KnotData} from '../../types.ts'

export default {
  id: 'clockwork_heart',
  candidateId: 'glm',
  title: 'Clockwork Heart',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Its patient mechanism measures neither hours nor distance, only longing.',
  placeholder: {
    color: '#e0a93e',
    shading: 'metal',
  },
} as const satisfies KnotData
