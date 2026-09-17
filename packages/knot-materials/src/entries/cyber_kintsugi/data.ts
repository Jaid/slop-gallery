import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cyber_kintsugi',
  candidateId: 'gemini_flash',
  title: 'Cyber Kintsugi',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A fractured circuit heals itself with a seam of electric gold.',
  placeholder: {
    color: '#fbbf24',
    shading: 'stone',
  },
} as const satisfies KnotData
