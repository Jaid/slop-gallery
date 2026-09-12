import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'iridescent_scarab',
  number: 187,
  title: 'Iridescent Scarab',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  accent: '#c9a227',
  highlighted: false,
} as const satisfies KnotData
