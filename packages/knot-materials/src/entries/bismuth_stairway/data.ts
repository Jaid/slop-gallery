import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_stairway',
  candidateId: 'glm',
  title: 'Bismuth Stairway',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'Iridescent steps climb toward a landing that never arrives.',
  placeholder: {
    color: '#ff9de6',
    shading: 'metal',
  },
} as const satisfies KnotData
