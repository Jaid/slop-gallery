import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'saffron_cathedral',
  number: 4,
  title: 'Saffron Cathedral',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#ffc25c',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
