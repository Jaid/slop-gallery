import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hoarfrost_hymn',
  candidateId: 'deepseek',
  title: 'Hoarfrost Hymn',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Winter sings one note at a time, and the ice writes down what it hears.',
  placeholder: {
    color: '#5aa8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
