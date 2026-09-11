import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chrono_sand',
  number: 59,
  title: 'Chrono Amber',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#ffcc00',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
