import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_glass',
  title: 'Stellar Nursery',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#ff00aa',
  highlighted: false,
} as const satisfies KnotData
