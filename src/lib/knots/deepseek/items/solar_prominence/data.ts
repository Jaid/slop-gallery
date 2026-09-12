import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_prominence',
  number: 188,
  title: 'Solar Prominence',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  accent: '#ff7a1a',
  highlighted: false,
} as const satisfies KnotData
