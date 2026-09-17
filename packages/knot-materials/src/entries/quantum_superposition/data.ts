import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_superposition',
  candidateId: 'qwen_max',
  title: 'Quantum Superposition',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'The object offers several versions of itself, none willing to become the only one.',
  placeholder: {
    color: '#4facfe',
    shading: 'ghost',
  },
} as const satisfies KnotData
