import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magma_chrysalis',
  number: 86,
  title: 'Magma Chrysalis',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#fb923c',
  highlighted: false,
} as const satisfies KnotData
