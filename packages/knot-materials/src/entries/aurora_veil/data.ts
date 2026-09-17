import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_veil',
  candidateId: 'deepseek',
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'The night draws a translucent curtain across its distant fires.',
  placeholder: {
    color: '#7dffcf',
    shading: 'glass',
  },
} as const satisfies KnotData
