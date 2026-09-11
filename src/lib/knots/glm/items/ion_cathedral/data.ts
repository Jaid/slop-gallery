import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ion_cathedral',
  number: 134,
  title: 'Ion Cathedral',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#9d6bff',
  highlighted: false,
} as const satisfies KnotData
