import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meteorite_memory',
  number: 76,
  title: 'Meteorite Memory',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#bdcad5',
  highlighted: false,
} as const satisfies KnotData
