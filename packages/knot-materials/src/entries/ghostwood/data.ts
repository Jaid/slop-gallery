import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ghostwood',
  candidateId: 'qwen_max',
  title: 'Spirit Birch',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'The grain remembers a tree that no longer casts a shadow.',
  placeholder: {
    color: '#e6f2ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
