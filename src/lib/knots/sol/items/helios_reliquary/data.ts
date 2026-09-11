import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_reliquary',
  number: 65,
  title: 'Helios Reliquary',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  accent: '#ff9a3d',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
