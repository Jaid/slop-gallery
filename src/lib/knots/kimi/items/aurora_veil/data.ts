import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'aurora_veil',
  number: 49,
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'Kimi K3'
    }
  },
  accent: '#7dffd0',
  highlighted: false,
  archived: true
} as const satisfies KnotData
