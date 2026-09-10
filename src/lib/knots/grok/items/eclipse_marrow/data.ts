import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'eclipse_marrow',
  number: 48,
  title: 'Eclipse Marrow',
  author: {
    model: {
      title: 'Grok 4.6'
    }
  },
  accent: '#ff8a5c',
  highlighted: false,
  archived: true
} as const satisfies KnotData
