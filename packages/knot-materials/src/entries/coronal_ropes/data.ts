import type {KnotData} from '../../types.ts'

export default {
  id: 'coronal_ropes',
  candidateId: 'gemini_flash',
  title: 'Coronal Ropes',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Thermonuclear convection boils across magnetic sunspots as coronal plasma ropes twist along the stellar horizon.',
  displacement: 0.008,
  placeholder: {
    color: '#d65c20',
    shading: 'smooth',
  },
} as const satisfies KnotData
