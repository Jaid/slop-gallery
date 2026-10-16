import type {KnotData} from '../../types.ts'

export default {
  id: 'hourglass_heart',
  candidateId: 'glm',
  title: 'Hourglass Heart',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'A patient pulse turns falling moments into something almost solid.',
  placeholder: {
    color: '#ffb45e',
    shading: 'glass',
  },
} as const satisfies KnotData
