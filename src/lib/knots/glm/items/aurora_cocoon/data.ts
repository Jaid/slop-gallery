import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_cocoon',
  number: 135,
  title: 'Aurora Cocoon',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#39ffb0',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
