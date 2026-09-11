import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_reliquary',
  number: 73,
  title: 'Solar Reliquary',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  accent: '#e6bd62',
  highlighted: false,
} as const satisfies KnotData
