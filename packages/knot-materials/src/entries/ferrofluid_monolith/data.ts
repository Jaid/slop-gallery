import type {KnotData} from '../../types.ts'

export default {
  id: 'ferrofluid_monolith',
  candidateId: 'gemini_flash',
  title: 'Ferrofluid Monolith',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A dark monument remembers that it was once a flowing thing.',
  placeholder: {
    color: '#c850c0',
    shading: 'liquid',
  },
} as const satisfies KnotData
