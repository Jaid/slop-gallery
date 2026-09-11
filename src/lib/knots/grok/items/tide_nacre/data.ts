import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tide_nacre',
  number: 42,
  title: 'Tide Nacre',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#7ef0d6',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
