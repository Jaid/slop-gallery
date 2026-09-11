import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'coralline_crown',
  number: 97,
  title: 'Coralline Crown',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#8ce6cf',
  highlighted: true,
  displacement: 0.085,
} as const satisfies KnotData
