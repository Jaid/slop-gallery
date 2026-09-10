import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'wraith_glass',
  number: 16,
  title: 'Wraith Glass',
  author: {
    model: {
      title: 'Claude Sonnet 5'
    }
  },
  accent: '#cfe9ff',
  highlighted: false,
  archived: true
} as const satisfies KnotData
