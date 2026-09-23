import type {KnotData} from '../../types.ts'

export default {
  id: 'birefringent_crystal',
  candidateId: 'gemini_flash',
  title: 'Birefringent Crystal',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Each ray enters alone and leaves with a second story.',
  placeholder: {
    color: '#8ee3ff',
    shading: 'glass',
  },
} as const satisfies KnotData
