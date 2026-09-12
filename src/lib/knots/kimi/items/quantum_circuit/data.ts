import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_circuit',
  number: 166,
  title: 'Quantum Circuit',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#ffd76a',
  highlighted: false,
} as const satisfies KnotData
