import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'midnight_opal',
  number: 131,
  title: 'Midnight Opal',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#4dffc3',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
