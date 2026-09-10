import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'glacial_memory',
  number: 79,
  title: 'Glacial Memory',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra'
    }
  },
  accent: '#b9efff',
  highlighted: false
} as const satisfies KnotData
