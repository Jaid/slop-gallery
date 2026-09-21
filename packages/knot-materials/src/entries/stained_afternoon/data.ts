import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'stained_afternoon',
  candidateId: 'deepseek',
  title: 'Stained Afternoon',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A thousand small windows hold the afternoon and refuse to let it go.',
  displacement: 0.0026,
  placeholder: {
    color: '#7b3652',
    shading: 'glass',
  },
} as const satisfies KnotData
