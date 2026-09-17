import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chromospheric_spicule',
  candidateId: 'gemini_flash',
  title: 'Chromospheric Spicule',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Fine tongues of fire rise from the restless skin of a star.',
  placeholder: {
    color: '#ff3b14',
    shading: 'smooth',
  },
} as const satisfies KnotData
