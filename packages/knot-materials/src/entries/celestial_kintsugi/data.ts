import type {KnotData} from '../../types.ts'

export default {
  id: 'celestial_kintsugi',
  candidateId: 'gemini_flash',
  title: 'Celestial Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Fractured eggshell porcelain mended with seams of pure liquid gold, turning fragile brokenness into sacred art.',
  placeholder: {
    color: '#e7dfd2',
    shading: 'smooth',
  },
} as const satisfies KnotData
