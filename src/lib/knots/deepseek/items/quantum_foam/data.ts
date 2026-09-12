import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_foam',
  title: 'Quantum Foam',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#c0a7ff',
  highlighted: false,
} as const satisfies KnotData
