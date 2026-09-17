import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hoar_frost',
  title: 'Hoar Frost',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  accent: '#eaf6ff',
  highlighted: false,
} as const satisfies KnotData
