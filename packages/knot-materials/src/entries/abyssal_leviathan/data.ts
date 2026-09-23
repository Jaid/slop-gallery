import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_leviathan',
  candidateId: 'qwen_max',
  title: 'Abyssal Leviathan',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'An ancient hide remembers the pressure of uncharted oceans.',
  placeholder: {
    color: '#00ffcc',
    shading: 'smooth',
  },
} as const satisfies KnotData
