import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_caged',
  candidateId: 'deepseek',
  title: 'Aurora Caged',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A wandering sky has learned the shape of a vessel.',
  placeholder: {
    color: '#7dffb2',
    shading: 'smooth',
  },
} as const satisfies KnotData
