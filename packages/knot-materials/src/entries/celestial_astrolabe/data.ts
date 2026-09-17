import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celestial_astrolabe',
  candidateId: 'gemini_flash',
  title: 'Celestial Astrolabe',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Brass remembers the positions of stars that have already moved on.',
  placeholder: {
    color: '#f3c14b',
    shading: 'metal',
  },
} as const satisfies KnotData
