import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_veil',
  number: 122,
  title: 'Aurora Veil',
  harness: 'none',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#00ff9c',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
