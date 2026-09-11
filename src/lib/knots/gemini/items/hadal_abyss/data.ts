import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hadal_abyss',
  number: 82,
  title: 'Hadal Siphonophore',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  accent: '#00f5d4',
  highlighted: false,
} as const satisfies KnotData
