import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'amber_requiem',
  candidateId: 'deepseek',
  title: 'Amber Requiem',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A golden tomb where one summer keeps its smallest citizens, perfectly still, forever.',
  placeholder: {
    color: '#b86b17',
    shading: 'glass',
  },
} as const satisfies KnotData
