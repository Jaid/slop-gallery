import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_staircase',
  candidateId: 'deepseek',
  title: 'Bismuth Staircase',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The metal refused to grow smoothly, and stacked its own rainbow instead.',
  displacement: 0.15,
  placeholder: {
    color: '#9a7cc8',
    shading: 'metal',
  },
} as const satisfies KnotData
