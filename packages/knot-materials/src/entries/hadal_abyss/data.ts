import type {KnotData} from '../../types.ts'

export default {
  id: 'hadal_abyss',
  candidateId: 'gemini_flash',
  title: 'Hadal Siphonophore',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Pressure and darkness have polished this relic beyond the reach of waves.',
  placeholder: {
    color: '#00f5d4',
    shading: 'smooth',
  },
} as const satisfies KnotData
