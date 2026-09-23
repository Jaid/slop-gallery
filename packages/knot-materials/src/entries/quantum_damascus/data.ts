import type {KnotData} from '../../types.ts'

export default {
  id: 'quantum_damascus',
  candidateId: 'gemini_flash',
  title: 'Quantum Damascus',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Folded bands of metal seem to belong to more than one possible pattern.',
  placeholder: {
    color: '#5c7cfa',
    shading: 'metal',
  },
} as const satisfies KnotData
