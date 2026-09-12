import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'seraphim_veil',
  number: 69,
  title: 'Seraphim Veil',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#ffe6bd',
  highlighted: false,
} as const satisfies KnotData
