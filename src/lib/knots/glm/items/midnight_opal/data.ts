import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'midnight_opal',
  number: 131,
  title: 'Midnight Opal',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#4dffc3',
  highlighted: false,
} as const satisfies KnotData
