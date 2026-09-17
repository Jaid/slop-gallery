import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_foam',
  candidateId: 'deepseek',
  title: 'Quantum Foam',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'A restless froth suggests that even empty space has a weather of its own.',
  placeholder: {
    color: '#c0a7ff',
    shading: 'liquid',
  },
} as const satisfies KnotData
