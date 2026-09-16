import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryo_bloom',
  title: 'Cryo Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#8cf5ff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
