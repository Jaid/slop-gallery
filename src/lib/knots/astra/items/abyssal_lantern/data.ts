import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'abyssal_lantern',
  number: 3,
  title: 'Abyssal Lantern',
  author: {
    model: {
      title: 'GPT-6 Astra'
    }
  },
  accent: '#46d6ff',
  highlighted: false,
  archived: true
} as const satisfies KnotData
