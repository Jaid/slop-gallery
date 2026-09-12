import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'honey_relic',
  number: 44,
  title: 'Honey Relic',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ffb347',
  highlighted: false,
} as const satisfies KnotData
