import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_siphonophore',
  candidateId: 'gemini_flash',
  title: 'Abyssal Siphonophore',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Drifting through the midnight trench, a glass colony pulses with traveling ribbons of living rainbow light.',
  placeholder: {
    color: '#0b6f78',
    shading: 'glass',
  },
} as const satisfies KnotData
