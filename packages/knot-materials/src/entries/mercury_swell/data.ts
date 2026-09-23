import type {KnotData} from '../../types.ts'

export default {
  id: 'mercury_swell',
  candidateId: 'deepseek',
  title: 'Mercury Swell',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A metal that forgot how to be solid and now only remembers how to reflect.',
  displacement: 0.002,
  placeholder: {
    color: '#aeb7c1',
    shading: 'metal',
  },
} as const satisfies KnotData
