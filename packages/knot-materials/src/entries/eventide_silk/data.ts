import type {KnotData} from '../../types.ts'

export default {
  id: 'eventide_silk',
  candidateId: 'qwen_max',
  title: 'Eventide Silk',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'The last colors of evening settle into a weightless fold.',
  placeholder: {
    color: '#e94560',
    shading: 'fabric',
  },
} as const satisfies KnotData
