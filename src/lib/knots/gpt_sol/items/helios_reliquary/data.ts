import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_reliquary',
  title: 'Helios Reliquary',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#ff9a3d',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
