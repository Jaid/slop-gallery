import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'iris_steel',
  number: 47,
  title: 'Iris Steel',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#9ab8ff',
  highlighted: false,
} as const satisfies KnotData
