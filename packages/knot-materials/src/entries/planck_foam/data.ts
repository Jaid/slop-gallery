import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'planck_foam',
  candidateId: 'hy',
  title: 'Planck Foam',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'Tiny chambers gather at the edge of what can be measured.',
  placeholder: {
    color: '#7a5cff',
    shading: 'liquid',
  },
} as const satisfies KnotData
