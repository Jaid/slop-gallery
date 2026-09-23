import type {KnotData} from '../../types.ts'

export default {
  id: 'living_circuit',
  candidateId: 'gpt_astra',
  title: 'Photon Lattice',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'A pulse runs through pathways that seem to have grown rather than been drawn.',
  placeholder: {
    color: '#55f4dc',
    shading: 'glass',
  },
} as const satisfies KnotData
