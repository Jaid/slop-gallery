import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ephemeral_foam',
  title: 'Ephemeral Assembly',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  accent: '#a3eadd',
  highlighted: false,
} as const satisfies KnotData
