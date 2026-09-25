import type {KnotData} from '../../types.ts'

// Mage run: 4AEfQg7Qgj1dEVQ.
export default {
  id: 'living_kintsugi',
  candidateId: 'gemini_flash',
  title: 'Living Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ancient black lacquer cradles fractures that refuse to stay silent, mended with living gold that pulses like a beating heart.',
  placeholder: {
    color: '#2e1215',
    shading: 'smooth',
  },
} as const satisfies KnotData
