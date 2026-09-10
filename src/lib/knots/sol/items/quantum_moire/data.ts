import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'quantum_moire',
  number: 71,
  title: 'Quantum Moiré',
  author: {
    model: {
      title: 'GPT-5.6 Sol'
    }
  },
  accent: '#6de9ff',
  highlighted: false,
  archived: true
} as const satisfies KnotData
