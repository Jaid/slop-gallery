import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'petrified_lightning',
  number: 185,
  title: 'Petrified Lightning',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#aaddff',
  highlighted: false,
} as const satisfies KnotData
