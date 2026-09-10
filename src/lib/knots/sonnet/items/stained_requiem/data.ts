import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'stained_requiem',
  number: 12,
  title: 'Stained Requiem',
  author: {
    model: {
      title: 'Claude Sonnet 5'
    }
  },
  accent: '#d24bd6',
  highlighted: true,
  archived: true
} as const satisfies KnotData
