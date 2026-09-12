import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prism_fracture',
  title: 'Chronoclast',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#ffffff',
  highlighted: false,
} as const satisfies KnotData
