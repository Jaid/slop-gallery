import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'molten_core',
  number: 10,
  title: 'Molten Core',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#ff6a3d',
  highlighted: false,
} as const satisfies KnotData
