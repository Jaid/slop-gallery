import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_circuit',
  candidateId: 'kimi',
  title: 'Quantum Circuit',
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
