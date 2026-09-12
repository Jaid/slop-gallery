import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vantablack_filigree',
  number: 127,
  title: 'Vantablack Filigree',
  harness: 'none',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#ff2a5f',
  highlighted: false,
} as const satisfies KnotData
