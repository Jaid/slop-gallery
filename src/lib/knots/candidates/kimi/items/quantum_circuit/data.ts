import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_circuit',
  title: 'Quantum Circuit',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  accent: '#ffd76a',
  highlighted: true,
} as const satisfies KnotData
