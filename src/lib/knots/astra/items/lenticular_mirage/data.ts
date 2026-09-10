import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'lenticular_mirage',
  number: 6,
  title: 'Lenticular Mirage',
  author: {
    model: {
      title: 'GPT-6 Astra'
    }
  },
  accent: '#a2f4f1',
  highlighted: true
} as const satisfies KnotData
