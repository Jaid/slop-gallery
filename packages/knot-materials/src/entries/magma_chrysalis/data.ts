import type {KnotData} from '../../types.ts'

export default {
  id: 'magma_chrysalis',
  candidateId: 'gemini_flash',
  title: 'Magma Chrysalis',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A shell of cooling rock guards a bright metamorphosis within.',
  placeholder: {
    color: '#fb923c',
    shading: 'liquid',
  },
} as const satisfies KnotData
