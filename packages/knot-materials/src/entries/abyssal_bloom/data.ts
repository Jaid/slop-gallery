import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bloom',
  candidateId: 'hy',
  title: 'Abyssal Bloom',
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
