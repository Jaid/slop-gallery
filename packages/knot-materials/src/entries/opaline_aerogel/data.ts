import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline_aerogel',
  candidateId: 'gemini_flash',
  title: 'Opaline Aerogel',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A cloud has learned to hold its shape, but not to keep its colors still.',
  placeholder: {
    color: '#78c6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
