import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cardinal_velvet',
  number: 75,
  title: 'Cardinal Velvet',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#e54b70',
  highlighted: false,
} as const satisfies KnotData
