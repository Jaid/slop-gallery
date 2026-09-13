import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cataphote_rouge',
  title: 'Cataphote Rouge',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  accent: '#f7472c',
  highlighted: false,
} as const satisfies KnotData
