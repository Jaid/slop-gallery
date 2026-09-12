import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'liquid_mercury',
  number: 61,
  title: 'Ferrofluid Bloom',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#e0e0e0',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
