import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'petrified_lightning',
  candidateId: 'qwen_max',
  title: 'Petrified Lightning',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A thunderbolt has spent centuries learning the stillness of a mineral.',
  placeholder: {
    color: '#aaddff',
    shading: 'stone',
  },
} as const satisfies KnotData
