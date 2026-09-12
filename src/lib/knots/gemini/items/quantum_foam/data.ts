import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_foam',
  number: 28,
  title: 'Quantum Foam',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#398bff',
  highlighted: false,
} as const satisfies KnotData
