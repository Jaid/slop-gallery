import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelium_bloom',
  number: 192,
  title: 'Mycelium Bloom',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  accent: '#44ffdd',
  highlighted: false,
} as const satisfies KnotData
