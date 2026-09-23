import type {KnotData} from '../../types.ts'

export default {
  id: 'solar_chronosphere',
  candidateId: 'gemini_flash',
  title: 'Solar Chronosphere',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Convective granules churn beneath coronal arches, burning with the fierce pulse of a newborn star.',
  placeholder: {
    color: '#df5a12',
    shading: 'smooth',
  },
} as const satisfies KnotData
