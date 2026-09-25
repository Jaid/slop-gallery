import type {KnotData} from '../../types.ts'

// Mage run: 4AEfQg7Qgj1dEVQ; original ID: scarab_chitin.
export default {
  id: 'scarab_armor',
  candidateId: 'gemini_flash',
  title: 'Scarab Armor',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Interlocking plates of tempered chitin deflect the light with microscopic grooves, shimmering between emerald and royal amethyst.',
  placeholder: {
    color: '#27735c',
    shading: 'metal',
  },
} as const satisfies KnotData
