import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nocturne_moth',
  title: 'Nocturne Moth',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#58d6bc',
  highlighted: true,
} as const satisfies KnotData
