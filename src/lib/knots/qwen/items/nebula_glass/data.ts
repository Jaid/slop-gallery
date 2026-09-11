import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_glass',
  number: 60,
  title: 'Stellar Nursery',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#ff00aa',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
