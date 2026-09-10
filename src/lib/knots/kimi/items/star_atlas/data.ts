import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'star_atlas',
  number: 55,
  title: 'Star Atlas',
  author: {
    model: {
      title: 'Kimi K3'
    }
  },
  accent: '#ffe9a8',
  highlighted: false,
  archived: true
} as const satisfies KnotData
