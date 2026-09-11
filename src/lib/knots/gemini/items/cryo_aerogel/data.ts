import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryo_aerogel',
  number: 87,
  title: 'Cryo Aerogel',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#67e8f9',
  highlighted: false,
} as const satisfies KnotData
