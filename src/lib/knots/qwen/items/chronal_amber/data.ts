import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chronal_amber',
  number: 182,
  title: 'Chronal Amber',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#ff8c00',
  highlighted: false,
} as const satisfies KnotData
