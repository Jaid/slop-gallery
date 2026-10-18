import type {KnotData} from '../../types.ts'

export default {
  id: 'winter_script',
  candidateId: 'deepseek',
  title: 'Winter Script',
  createdAt: 1_790_125_939,
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
