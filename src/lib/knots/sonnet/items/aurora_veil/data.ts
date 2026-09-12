import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_veil',
  number: 9,
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#8ff5d4',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
