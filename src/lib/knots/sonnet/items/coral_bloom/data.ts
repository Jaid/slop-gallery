import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'coral_bloom',
  number: 11,
  title: 'Coral Bloom',
  author: {
    model: {
      title: 'Claude Sonnet 5'
    }
  },
  accent: '#ff85ab',
  highlighted: false,
  archived: true
} as const satisfies KnotData
