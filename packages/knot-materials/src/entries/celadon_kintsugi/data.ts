import type {KnotData} from '../../types.ts'

export default {
  id: 'celadon_kintsugi',
  candidateId: 'deepseek',
  title: 'Celadon Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The break is not hidden but honored; where the porcelain failed, gold remembers the shape of the wound.',
  displacement: 0.007,
  placeholder: {
    color: '#82927d',
    shading: 'stone',
  },
} as const satisfies KnotData
