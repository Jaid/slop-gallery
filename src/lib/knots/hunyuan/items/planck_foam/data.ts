import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'planck_foam',
  number: 125,
  title: 'Planck Foam',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#7a5cff',
  highlighted: false,
} as const satisfies KnotData
