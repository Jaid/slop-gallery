import type {KnotData} from '../../types.ts'

export default {
  id: 'photonic_lattice',
  candidateId: 'gemini_flash',
  title: 'Photonic Lattice',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Coherent laser pulses race through microscopic sapphire waveguides, splitting into sharp diffraction fans upon inspection.',
  placeholder: {
    color: '#315284',
    shading: 'metal',
  },
} as const satisfies KnotData
