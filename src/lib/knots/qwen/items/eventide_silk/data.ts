import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'eventide_silk',
  number: 183,
  title: 'Eventide Silk',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#e94560',
  highlighted: false,
} as const satisfies KnotData
