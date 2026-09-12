import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'neutron_crust',
  number: 30,
  title: 'Neutron Crust',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#ffe17d',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
