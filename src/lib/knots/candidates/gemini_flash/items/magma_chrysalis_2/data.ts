import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magma_chrysalis_2',
  title: 'Magma Chrysalis',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#ff4d17',
  displacement: 0.018,
  highlighted: true,
} as const satisfies KnotData
