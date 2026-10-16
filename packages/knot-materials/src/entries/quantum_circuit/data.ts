import type {KnotData} from '../../types.ts'

export default {
  id: 'quantum_circuit',
  candidateId: 'kimi',
  title: 'Quantum Circuit',
  createdAt: 1_789_231_507,
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A tiny network follows several bright possibilities before choosing a path.',
  placeholder: {
    color: '#ffd76a',
    shading: 'smooth',
  },
} as const satisfies KnotData
