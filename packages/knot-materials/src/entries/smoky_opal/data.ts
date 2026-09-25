import type {KnotData} from '../../types.ts'

// Mage run: 4AEfQg7Qgj1dEVQ; original ID: prismatic_opal.
export default {
  id: 'smoky_opal',
  candidateId: 'gemini_flash',
  title: 'Smoky Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Trapped within smoky silica, microscopic crystal domains catch the ambient dark and shatter it into fire and peacock green.',
  placeholder: {
    color: '#241508',
    shading: 'glass',
  },
} as const satisfies KnotData
