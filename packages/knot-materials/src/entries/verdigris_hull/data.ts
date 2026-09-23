import type {KnotData} from '../../types.ts'

export default {
  id: 'verdigris_hull',
  candidateId: 'hy',
  title: 'Verdigris Hull',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The metal keeps a tide mark from a voyage no map remembers.',
  placeholder: {
    color: '#3fa89b',
    shading: 'smooth',
  },
} as const satisfies KnotData
