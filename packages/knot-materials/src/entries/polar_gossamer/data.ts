import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'polar_gossamer',
  candidateId: 'hy',
  title: 'Aurora Veil',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'A fine green thread drifts loose from the fabric of the northern sky.',
  placeholder: {
    color: '#00ff9c',
    shading: 'fabric',
  },
  archived: true,
} as const satisfies KnotData
