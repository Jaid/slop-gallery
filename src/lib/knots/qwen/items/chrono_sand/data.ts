import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chrono_sand',
  title: 'Chrono Amber',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#ffcc00',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
