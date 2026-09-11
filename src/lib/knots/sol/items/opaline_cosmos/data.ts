import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline_cosmos',
  number: 67,
  title: 'Opaline Cosmos',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#c6b6ff',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
