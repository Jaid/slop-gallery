import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ember_cortex',
  number: 130,
  title: 'Ember Cortex',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#ff5a1f',
  highlighted: false,
} as const satisfies KnotData
