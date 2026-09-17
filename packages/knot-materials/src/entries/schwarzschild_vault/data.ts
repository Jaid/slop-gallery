import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'schwarzschild_vault',
  candidateId: 'gemini_flash',
  title: 'Event Horizon',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A dark chamber gathers every reflection and gives none of them a straight path out.',
  placeholder: {
    color: '#38bdf8',
    shading: 'smooth',
  },
} as const satisfies KnotData
