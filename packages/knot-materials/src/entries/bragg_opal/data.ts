import type {KnotData} from '../../types.ts'

export default {
  id: 'bragg_opal',
  candidateId: 'gemini_flash',
  title: 'Bragg Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Amorphous silica spheres trap wandering beams, igniting sudden fires of emerald, ruby and violet.',
  placeholder: {
    color: '#254b5c',
    shading: 'glass',
  },
} as const satisfies KnotData
