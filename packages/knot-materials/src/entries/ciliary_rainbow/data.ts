import type {KnotData} from '../../types.ts'

export default {
  id: 'ciliary_rainbow',
  candidateId: 'gemini_flash',
  title: 'Ciliary Rainbow',
  createdAt: 1_792_053_515,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ciliary comb rows refract the black ocean into traveling rainbows, pulsing to an ancient rhythm.',
  placeholder: {
    color: '#55bccc',
    shading: 'glass',
  },
} as const satisfies KnotData
