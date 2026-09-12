import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'morpho_regalia',
  number: 102,
  title: 'Morpho Regalia',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  accent: '#54d8ff',
  highlighted: false,
} as const satisfies KnotData
