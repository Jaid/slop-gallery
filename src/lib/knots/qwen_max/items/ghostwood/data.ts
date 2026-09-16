import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ghostwood',
  title: 'Spirit Birch',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#e6f2ff',
  highlighted: false,
} as const satisfies KnotData
