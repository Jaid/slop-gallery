import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'prism_cascade',
  number: 24,
  title: 'Prism Cascade',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash'
    }
  },
  accent: '#ffb0e0',
  highlighted: true
} as const satisfies KnotData
