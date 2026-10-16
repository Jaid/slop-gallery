import type {KnotData} from '../../types.ts'

export default {
  id: 'drowned_basilica',
  candidateId: 'deepseek',
  title: 'Sunken Cathedral',
  createdAt: 1_789_075_137,
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
