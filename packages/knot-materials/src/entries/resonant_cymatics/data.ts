import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'resonant_cymatics',
  candidateId: 'gemini_flash',
  title: 'Resonant Cymatics',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Dust gathers into changing figures under the persuasion of an unheard note.',
  placeholder: {
    color: '#38ef7d',
    shading: 'smooth',
  },
} as const satisfies KnotData
