import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chitin_phantom',
  number: 31,
  title: 'Chitin Phantom',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#59e6ff',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
