import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'gossamer_dew',
  number: 155,
  title: 'Gossamer Dew',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#d7ecff',
  highlighted: false,
} as const satisfies KnotData
