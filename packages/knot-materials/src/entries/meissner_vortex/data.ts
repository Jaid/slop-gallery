import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meissner_vortex',
  candidateId: 'gemini_flash',
  title: 'Meissner Vortex',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Quantized magnetic flux threads a ceramic lattice, holding pure currents in frictionless stillness.',
  placeholder: {
    color: '#14556a',
    shading: 'metal',
  },
} as const satisfies KnotData
