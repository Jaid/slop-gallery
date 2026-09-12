import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_nacre',
  number: 147,
  title: 'Abyssal Nacre',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#7de8d0',
  highlighted: false,
} as const satisfies KnotData
