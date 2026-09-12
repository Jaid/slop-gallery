import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'liquid_chrome',
  number: 123,
  title: 'Liquid Chrome',
  harness: 'none',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#ff7a1a',
  highlighted: false,
} as const satisfies KnotData
