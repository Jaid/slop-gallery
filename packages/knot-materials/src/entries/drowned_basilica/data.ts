import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'drowned_basilica',
  candidateId: 'deepseek',
  title: 'Sunken Cathedral',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'Water passes through the arches where bells once held the air.',
  placeholder: {
    color: '#4fd2ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
