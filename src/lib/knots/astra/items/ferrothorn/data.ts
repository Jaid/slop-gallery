import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrothorn',
  title: 'Ferrothorn',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  accent: '#98b8c4',
  displacement: 0.048,
  highlighted: true,
} as const satisfies KnotData
