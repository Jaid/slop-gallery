import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'imperial_porcelain',
  number: 74,
  title: 'Imperial Porcelain',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#426cda',
  highlighted: false,
} as const satisfies KnotData
