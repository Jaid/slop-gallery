import type {KnotData} from '../../types.ts'

export default {
  id: 'liquid_chrome',
  candidateId: 'hy',
  title: 'Liquid Chrome',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'The room pours across a silver surface that refuses to stay still.',
  placeholder: {
    color: '#ff7a1a',
    shading: 'liquid',
  },
} as const satisfies KnotData
