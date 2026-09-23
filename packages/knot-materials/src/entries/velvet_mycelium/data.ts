import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_mycelium',
  candidateId: 'gemini_flash',
  title: 'Velvet Mycelium',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A dark, soft garden sends luminous threads through its hidden undergrowth.',
  placeholder: {
    color: '#d946ef',
    shading: 'fabric',
  },
} as const satisfies KnotData
