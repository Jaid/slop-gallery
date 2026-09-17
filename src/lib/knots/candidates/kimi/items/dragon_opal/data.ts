import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'dragon_opal',
  title: 'Dragon Opal',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#ff9df0',
  highlighted: true,
} as const satisfies KnotData
