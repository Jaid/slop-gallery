import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_caged',
  number: 106,
  title: 'Aurora Caged',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#7dffb2',
  highlighted: false,
} as const satisfies KnotData
