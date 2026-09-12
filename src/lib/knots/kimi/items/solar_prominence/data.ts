import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_prominence',
  number: 50,
  title: 'Solar Prominence',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#ff7a3c',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
