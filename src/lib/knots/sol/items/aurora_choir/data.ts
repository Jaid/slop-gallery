import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'aurora_choir',
  number: 66,
  title: 'Aurora Choir',
  author: {
    model: {
      title: 'GPT-5.6 Sol'
    }
  },
  accent: '#61ffd3',
  highlighted: false,
  archived: true
} as const satisfies KnotData
