import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bioluminescence',
  candidateId: 'gemini_flash',
  title: 'Abyssal Bioluminescence',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Tiny colonies carry their blue messages through a sea without a sunrise.',
  placeholder: {
    color: '#00ffd0',
    shading: 'glass',
  },
} as const satisfies KnotData
