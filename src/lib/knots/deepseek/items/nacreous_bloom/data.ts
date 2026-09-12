import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacreous_bloom',
  number: 112,
  title: 'Nacreous Bloom',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#ffb7e8',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
