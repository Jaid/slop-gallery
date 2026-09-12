import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinnabar_palimpsest',
  number: 152,
  title: 'Cinnabar Palimpsest',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#e23b2a',
  highlighted: false,
} as const satisfies KnotData
