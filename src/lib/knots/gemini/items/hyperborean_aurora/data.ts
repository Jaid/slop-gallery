import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'hyperborean_aurora',
  number: 26,
  title: 'Hyperborean Aurora',
  author: {
    model: {
      title: 'Gemini 3.6 Flash'
    }
  },
  accent: '#47ffb2',
  highlighted: false,
  archived: true
} as const satisfies KnotData
