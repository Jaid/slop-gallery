import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'rose_window',
  candidateId: 'deepseek',
  title: 'Rose Window',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Someone folded a cathedral into a ribbon and forgot to take the light out.',
  placeholder: {
    color: '#7d405f',
    shading: 'glass',
  },
} as const satisfies KnotData
