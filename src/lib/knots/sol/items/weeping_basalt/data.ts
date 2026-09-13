import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'weeping_basalt',
  title: 'Weeping Basalt',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  accent: '#86cbd8',
  highlighted: false,
} as const satisfies KnotData
