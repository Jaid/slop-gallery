import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelial_bloom',
  candidateId: 'deepseek',
  title: 'Mycelial Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Beneath the bark a pale intelligence is mapping the dark, one thread at a time.',
  displacement: 0.012,
  placeholder: {
    color: '#4e5d38',
    shading: 'stone',
  },
} as const satisfies KnotData
