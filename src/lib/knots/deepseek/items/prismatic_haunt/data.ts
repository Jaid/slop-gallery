import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prismatic_haunt',
  number: 193,
  title: 'Prismatic Haunt',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  accent: '#c8e8ff',
  highlighted: false,
} as const satisfies KnotData
