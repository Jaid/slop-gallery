import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celestial_astrolabe',
  number: 126,
  title: 'Celestial Astrolabe',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#e6c27a',
  highlighted: false,
} as const satisfies KnotData
