import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_chromosphere',
  number: 27,
  title: 'Solar Chromosphere',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#ff8a3d',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
