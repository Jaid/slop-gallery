import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meissner_core',
  number: 53,
  title: 'Meissner Core',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#9fd8ff',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
