import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_lumen',
  number: 109,
  title: 'Abyssal Lumen',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#19f7d2',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
