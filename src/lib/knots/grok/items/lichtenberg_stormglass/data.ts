import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichtenberg_stormglass',
  number: 146,
  title: 'Lichtenberg Stormglass',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#cfe8ff',
  highlighted: false,
} as const satisfies KnotData
