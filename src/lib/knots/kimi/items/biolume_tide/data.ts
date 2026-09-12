import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'biolume_tide',
  number: 52,
  title: 'Biolume Tide',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#57ffe0',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
