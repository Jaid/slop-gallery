import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryo_aerogel',
  candidateId: 'gemini_flash',
  title: 'Cryo Aerogel',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Cold light rests in a substance almost too slight to cast a shadow.',
  placeholder: {
    color: '#67e8f9',
    shading: 'glass',
  },
} as const satisfies KnotData
