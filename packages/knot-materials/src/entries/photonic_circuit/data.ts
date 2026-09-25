import type {KnotData} from '../../types.ts'

// Mage run: 4AEfQg7Qgj1dEVQ.
export default {
  id: 'photonic_circuit',
  candidateId: 'gemini_flash',
  title: 'Photonic Circuit',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Coherent light races through etched sapphire waveguides, dreaming in binary along pathways narrower than thought.',
  placeholder: {
    color: '#283344',
    shading: 'metal',
  },
} as const satisfies KnotData
