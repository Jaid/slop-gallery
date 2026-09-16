import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_alloy',
  title: 'Nebula Alloy',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  accent: '#1c1e22',
  highlighted: false,
} as const satisfies KnotData
