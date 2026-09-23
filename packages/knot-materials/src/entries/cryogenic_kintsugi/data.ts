import type {KnotData} from '../../types.ts'

export default {
  id: 'cryogenic_kintsugi',
  candidateId: 'gemini_flash',
  title: 'Cryogenic Kintsugi',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Golden seams persuade the broken ice to remain a single story.',
  placeholder: {
    color: '#00f0ff',
    shading: 'glass',
  },
} as const satisfies KnotData
