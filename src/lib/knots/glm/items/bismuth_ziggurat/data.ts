import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_ziggurat',
  number: 133,
  title: 'Bismuth Ziggurat',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#ff9af0',
  highlighted: false,
  displacement: 0.055,
} as const satisfies KnotData
