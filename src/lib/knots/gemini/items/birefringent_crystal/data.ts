import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'birefringent_crystal',
  title: 'Birefringent Crystal',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#8ee3ff',
  highlighted: false,
} as const satisfies KnotData
