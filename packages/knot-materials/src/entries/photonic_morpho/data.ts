import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'photonic_morpho',
  candidateId: 'gemini_flash',
  title: 'Photonic Morpho',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: "Minute ridges persuade daylight to become the blue of a butterfly's wing.",
  placeholder: {
    color: '#0055ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
