import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_ctenophore',
  candidateId: 'gemini_flash',
  title: 'Abyssal Ctenophore',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ciliary comb rows refract the black ocean into traveling rainbows, pulsing to an ancient rhythm.',
  placeholder: {
    color: '#55bccc',
    shading: 'glass',
  },
} as const satisfies KnotData
