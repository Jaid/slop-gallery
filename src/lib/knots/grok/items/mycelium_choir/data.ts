import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelium_choir',
  number: 150,
  title: 'Mycelium Choir',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#6dffb0',
  highlighted: false,
} as const satisfies KnotData
