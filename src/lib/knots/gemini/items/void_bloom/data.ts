import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_bloom',
  number: 29,
  title: 'Void Bloom',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#b847ff',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
