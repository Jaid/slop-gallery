import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'infalling_halo',
  candidateId: 'deepseek',
  title: 'Infalling Halo',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The last thing light does before it gives up is bend into a perfect circle.',
  displacement: 0.0012,
  placeholder: {
    color: '#1a1020',
    shading: 'smooth',
  },
} as const satisfies KnotData
