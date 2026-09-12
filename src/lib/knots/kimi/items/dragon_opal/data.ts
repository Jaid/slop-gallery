import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'dragon_opal',
  number: 51,
  title: 'Dragon Opal',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#ff9df0',
  highlighted: false,
} as const satisfies KnotData
