import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'emberheart',
  number: 101,
  title: 'Emberheart',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ff5e2b',
  highlighted: false,
} as const satisfies KnotData
