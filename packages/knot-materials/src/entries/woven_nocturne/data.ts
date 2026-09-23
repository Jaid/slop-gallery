import type {KnotData} from '../../types.ts'

export default {
  id: 'woven_nocturne',
  candidateId: 'deepseek',
  title: 'Woven Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Indigo silk keeps being woven around the knot, and the shuttle leaves a golden thread of light behind it.',
  placeholder: {
    color: '#241a45',
    shading: 'fabric',
  },
} as const satisfies KnotData
