import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_umbra',
  number: 154,
  title: 'Velvet Umbra',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#c4a06a',
  highlighted: false,
} as const satisfies KnotData
