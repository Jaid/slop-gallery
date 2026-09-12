import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_superposition',
  number: 180,
  title: 'Quantum Superposition',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#4facfe',
  highlighted: false,
} as const satisfies KnotData
