import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chrysalis_engine',
  number: 70,
  title: 'Chrysalis Engine',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#53efd0',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
