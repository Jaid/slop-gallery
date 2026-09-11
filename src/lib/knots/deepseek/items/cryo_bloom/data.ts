import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryo_bloom',
  number: 108,
  title: 'Cryo Bloom',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#8cf5ff',
  highlighted: false,
} as const satisfies KnotData
