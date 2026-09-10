import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'phoenix_ember',
  number: 54,
  title: 'Phoenix Ember',
  author: {
    model: {
      title: 'Kimi K3'
    }
  },
  accent: '#ffb35c',
  highlighted: false,
  archived: true
} as const satisfies KnotData
