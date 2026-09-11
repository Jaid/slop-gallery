import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'morpho_veil',
  number: 132,
  title: 'Morpho Veil',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#3f7dff',
  highlighted: false,
} as const satisfies KnotData
