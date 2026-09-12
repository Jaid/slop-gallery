import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'scarab_aegis',
  number: 84,
  title: 'Scarab Aegis',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#10b981',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
