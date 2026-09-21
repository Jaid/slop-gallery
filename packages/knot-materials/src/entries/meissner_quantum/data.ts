import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meissner_quantum',
  candidateId: 'gemini_flash',
  title: 'Meissner Quantum',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Sub-zero ceramics trap magnetic vortices in silence, humming with superconducting currents that never decay.',
  placeholder: {
    color: '#163f58',
    shading: 'metal',
  },
} as const satisfies KnotData
