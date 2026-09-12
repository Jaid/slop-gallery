import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'birefringent_glacier',
  number: 151,
  title: 'Birefringent Glacier',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#9ad8ff',
  highlighted: false,
} as const satisfies KnotData
