import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_silk',
  number: 99,
  title: 'Solar Silk',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ffe6b0',
  highlighted: false,
} as const satisfies KnotData
