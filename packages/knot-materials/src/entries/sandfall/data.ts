import type {KnotData} from '../../types.ts'

export default {
  id: 'sandfall',
  candidateId: 'deepseek',
  title: 'Sandfall',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The dune has been walking for ten thousand years and will not answer to anything but wind and patience.',
  placeholder: {
    color: '#9c8253',
    shading: 'stone',
  },
} as const satisfies KnotData
