import type {KnotData} from '../../types.ts'

export default {
  id: 'radiometric_guilloche',
  candidateId: 'gemini_flash',
  title: 'Radiometric Guilloché',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Fine engraved loops shelter a faint green glow that outlasts the lamps.',
  placeholder: {
    color: '#ffd27d',
    shading: 'smooth',
  },
} as const satisfies KnotData
