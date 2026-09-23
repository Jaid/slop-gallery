import type {KnotData} from '../../types.ts'

export default {
  id: 'noctiluca',
  candidateId: 'deepseek',
  title: 'Noctiluca',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.016,
  flavorText: 'Every wave that breaks against your attention burns blue, then remembers nothing.',
  placeholder: {
    color: '#061a24',
    shading: 'liquid',
  },
} as const satisfies KnotData
