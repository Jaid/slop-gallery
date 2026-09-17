import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'folded_silence',
  title: 'Folded Silence',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  accent: '#e9dfc9',
  displacement: 0.048,
  highlighted: false,
} as const satisfies KnotData
