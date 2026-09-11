import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_dawn',
  number: 104,
  title: 'Kintsugi Dawn',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  accent: '#f2c14e',
  highlighted: false,
} as const satisfies KnotData
