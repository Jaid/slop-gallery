import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'radiometric_guilloche',
  title: 'Radiometric Guilloché',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#ffd27d',
  highlighted: false,
} as const satisfies KnotData
