import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'sunken_cathedral',
  number: 77,
  title: 'Sunken Cathedral',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#8cdeef',
  highlighted: false,
} as const satisfies KnotData
