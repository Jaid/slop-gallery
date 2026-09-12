import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bloom',
  number: 124,
  title: 'Abyssal Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#00ffcc',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
