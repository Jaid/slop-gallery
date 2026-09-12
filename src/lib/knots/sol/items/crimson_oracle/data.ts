import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'crimson_oracle',
  number: 68,
  title: 'Crimson Oracle',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#ff6f63',
  highlighted: false,
} as const satisfies KnotData
