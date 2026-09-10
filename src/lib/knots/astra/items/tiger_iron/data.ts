import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'tiger_iron',
  number: 78,
  title: 'Tiger Iron',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra'
    }
  },
  accent: '#edaa47',
  highlighted: false
} as const satisfies KnotData
