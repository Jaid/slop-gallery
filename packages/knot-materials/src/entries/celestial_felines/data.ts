import type {KnotData} from '../../types.ts'

// Mage run: 4AEfQg7Qgj1dEVQ.
export default {
  id: 'celestial_felines',
  candidateId: 'gemini_flash',
  title: 'Celestial Felines',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Star-born felines prowl across the cosmic void, their forms traced in diamond light and woven into eternal constellations.',
  placeholder: {
    color: '#080d22',
    shading: 'smooth',
  },
} as const satisfies KnotData
