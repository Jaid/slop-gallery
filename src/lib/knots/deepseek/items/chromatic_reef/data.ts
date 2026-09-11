import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chromatic_reef',
  number: 19,
  title: 'Chromatic Reef',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#ff6ec7',
  highlighted: true,
} as const satisfies KnotData
