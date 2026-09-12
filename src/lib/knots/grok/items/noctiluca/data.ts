import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'noctiluca',
  number: 45,
  title: 'Noctiluca',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#5dffb0',
  highlighted: false,
} as const satisfies KnotData
