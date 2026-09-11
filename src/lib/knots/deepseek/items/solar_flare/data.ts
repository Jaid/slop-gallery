import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_flare',
  number: 22,
  title: 'Solar Flare',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#ffd166',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
