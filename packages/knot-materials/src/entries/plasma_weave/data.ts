import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'plasma_weave',
  candidateId: 'hy',
  title: 'Plasma Weave',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Hot strands cross and part like threads in an electric loom.',
  placeholder: {
    color: '#00e5ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
