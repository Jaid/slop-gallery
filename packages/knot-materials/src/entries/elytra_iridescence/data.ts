import type {KnotData} from '../../types.ts'

export default {
  id: 'elytra_iridescence',
  candidateId: 'gemini_flash',
  title: 'Elytra Iridescence',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: "A beetle's armor holds more colors than its forest has names for.",
  placeholder: {
    color: '#27e8a7',
    shading: 'smooth',
  },
} as const satisfies KnotData
