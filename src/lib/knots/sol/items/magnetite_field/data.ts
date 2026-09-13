import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magnetite_field',
  title: 'Magnetite Field',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  accent: '#9dbbc2',
  displacement: 0.046,
  highlighted: false,
} as const satisfies KnotData
