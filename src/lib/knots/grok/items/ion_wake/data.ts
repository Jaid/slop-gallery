import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ion_wake',
  number: 158,
  title: 'Ion Wake',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#6cf0ff',
  highlighted: false,
} as const satisfies KnotData
