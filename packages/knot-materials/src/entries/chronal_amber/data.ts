import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chronal_amber',
  candidateId: 'qwen_max',
  title: 'Chronal Amber',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A single instant thickens into honey and refuses to pass.',
  placeholder: {
    color: '#ff8c00',
    shading: 'glass',
  },
} as const satisfies KnotData
