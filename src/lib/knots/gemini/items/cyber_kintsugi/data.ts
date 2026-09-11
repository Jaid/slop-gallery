import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cyber_kintsugi',
  number: 88,
  title: 'Cyber Kintsugi',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#fbbf24',
  highlighted: false,
} as const satisfies KnotData
