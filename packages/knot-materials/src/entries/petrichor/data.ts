import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'petrichor',
  candidateId: 'glm',
  title: 'Petrichor',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'The first rain leaves its dark fragrance in the memory of warm stone.',
  placeholder: {
    color: '#9fd8ff',
    shading: 'stone',
  },
  archived: true,
} as const satisfies KnotData
