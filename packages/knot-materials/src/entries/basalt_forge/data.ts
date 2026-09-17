import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'basalt_forge',
  candidateId: 'hy',
  title: 'Basalt Forge',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The mountain has not quite finished making this stone.',
  placeholder: {
    color: '#fdf6e3',
    shading: 'stone',
  },
} as const satisfies KnotData
