import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
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
  archived: true,
} as const satisfies KnotData
