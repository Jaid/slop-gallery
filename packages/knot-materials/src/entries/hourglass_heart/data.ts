import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hourglass_heart',
  candidateId: 'glm',
  title: 'Hourglass Heart',
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
