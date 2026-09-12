import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ghostwood',
  number: 62,
  title: 'Spirit Birch',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#e6f2ff',
  highlighted: false,
} as const satisfies KnotData
