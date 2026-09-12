import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_veil',
  number: 34,
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#68ffc0',
  highlighted: false,
} as const satisfies KnotData
