import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'phoenix_ember',
  title: 'Phoenix Ember',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#ffb35c',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
