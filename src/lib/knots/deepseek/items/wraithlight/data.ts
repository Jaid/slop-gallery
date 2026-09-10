import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'wraithlight',
  number: 23,
  title: 'Wraithlight',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash'
    }
  },
  accent: '#c8f0ff',
  highlighted: false,
  archived: true
} as const satisfies KnotData
