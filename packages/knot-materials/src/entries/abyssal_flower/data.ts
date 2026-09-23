import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_flower',
  candidateId: 'hy',
  title: 'Abyssal Flower',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'Something patient flowers beneath the reach of every lighthouse.',
  placeholder: {
    color: '#00ffcc',
    shading: 'fabric',
  },
} as const satisfies KnotData
