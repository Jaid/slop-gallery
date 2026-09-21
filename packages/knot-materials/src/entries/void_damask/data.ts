import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_damask',
  candidateId: 'gemini_flash',
  title: 'Void Damask',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Celestial threads weave across the dark, where moiré ripples shimmer like tides in an unseen sea.',
  placeholder: {
    color: '#121827',
    shading: 'fabric',
  },
} as const satisfies KnotData
