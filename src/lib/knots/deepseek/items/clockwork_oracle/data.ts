import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'clockwork_oracle',
  title: 'Clockwork Oracle',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  accent: '#ffcc44',
  highlighted: false,
} as const satisfies KnotData
