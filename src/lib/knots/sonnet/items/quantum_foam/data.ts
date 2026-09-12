import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_foam',
  number: 13,
  title: 'Quantum Foam',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#9df3ff',
  highlighted: false,
} as const satisfies KnotData
