import type {KnotData} from '../../types.ts'

export default {
  id: 'astral_loom',
  candidateId: 'gemini_flash',
  title: 'Astral Loom',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Constellations unravel into threads, then find another pattern.',
  placeholder: {
    color: '#f472b6',
    shading: 'fabric',
  },
} as const satisfies KnotData
