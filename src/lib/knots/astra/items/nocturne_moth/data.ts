import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'nocturne_moth',
  number: 80,
  title: 'Nocturne Moth',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra'
    }
  },
  accent: '#58d6bc',
  highlighted: false
} as const satisfies KnotData
