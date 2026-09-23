import type {KnotData} from '../../types.ts'

export default {
  id: 'tesseract_matrix',
  candidateId: 'gemini_flash',
  title: 'Tesseract Matrix',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A lattice hints at corners that cannot all belong to the same space.',
  placeholder: {
    color: '#00f5ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
