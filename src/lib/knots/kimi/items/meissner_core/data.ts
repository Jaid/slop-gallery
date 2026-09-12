import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meissner_core',
  title: 'Meissner Core',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#9fd8ff',
  highlighted: false,
} as const satisfies KnotData
