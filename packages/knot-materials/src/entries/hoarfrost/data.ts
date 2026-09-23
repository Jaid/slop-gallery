import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hoarfrost',
  candidateId: 'deepseek',
  title: 'Hoarfrost',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Winter practices its handwriting on the coldest surface it can find, then erases it before anyone can read.',
  placeholder: {
    color: '#9dbcd6',
    shading: 'glass',
  },
} as const satisfies KnotData
