import type {KnotData} from '../../types.ts'

export default {
  id: 'diffraction_choir',
  candidateId: 'gpt_astra',
  title: 'Diffraction Choir',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A thousand engraved grooves sing in wavelengths. Each step conducts another voice through the silver silence.',
  placeholder: {
    color: '#8d9eac',
    shading: 'metal',
  },
} as const satisfies KnotData
