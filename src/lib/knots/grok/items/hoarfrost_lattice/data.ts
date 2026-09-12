import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hoarfrost_lattice',
  number: 159,
  title: 'Hoarfrost Lattice',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#c5e7ff',
  highlighted: false,
} as const satisfies KnotData
