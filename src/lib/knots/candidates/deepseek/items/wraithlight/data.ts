import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'wraithlight',
  title: 'Wraithlight',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#c8f0ff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
