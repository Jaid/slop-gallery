import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ember_cortex',
  number: 130,
  title: 'Ember Cortex',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  accent: '#ff5a1f',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
