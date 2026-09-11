import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'eidolon_silk',
  number: 113,
  title: 'Eidolon Silk',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#c0c8ff',
  highlighted: false,
} as const satisfies KnotData
